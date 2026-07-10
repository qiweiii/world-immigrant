import { constants } from "node:fs";
import { access, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadCanonicalData } from "../src/lib/data";
import type { Source } from "../src/lib/schema";
import {
  type ContentChangeState,
  classifyContentChange,
  normalizeSourceText,
  selectDueSources,
  sha256,
  sourceRunRequiresReview,
} from "../src/lib/sourceMonitor";

type SourceState = {
  source_id: string;
  checked_at: string;
  final_url: string;
  status_code: number;
  content_type: string;
  raw_hash: string;
  normalized_hash: string;
  snapshot_id: string;
  etag?: string;
  last_modified?: string;
};

type MonitorState = {
  version: 1;
  sources: Record<string, SourceState>;
};

type SourceRun = {
  source_id: string;
  source_url: string;
  result:
    | ContentChangeState
    | "not_modified"
    | "fetch_failed"
    | "domain_rejected"
    | "extraction_required";
  checked_at: string;
  final_url?: string;
  status_code?: number;
  content_type?: string;
  raw_hash?: string;
  normalized_hash?: string;
  previous_normalized_hash?: string;
  snapshot_id?: string;
  expected_hint_misses?: string[];
  error?: string;
};

type RunReport = {
  version: 1;
  run_id: string;
  started_at: string;
  completed_at: string;
  dry_run: boolean;
  selected_source_ids: string[];
  requires_ai_review: boolean;
  counts: Record<string, number>;
  sources: SourceRun[];
};

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const argument = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const forceAll = hasFlag("--all");
const dryRun = hasFlag("--dry-run");
const jsonOnly = hasFlag("--json");
const limit = Number.parseInt(argument("--limit") ?? "5", 10);
const timeoutMs = Number.parseInt(argument("--timeout-ms") ?? "30000", 10);
const maxBytes = Number.parseInt(argument("--max-bytes") ?? "10000000", 10);
const root = process.cwd();
const stateDir = resolve(
  argument("--state-dir") ??
    process.env.WORLD_IMMIGRANT_SOURCE_STATE_DIR ??
    resolve(root, ".source-monitor"),
);
const statePath = resolve(stateDir, "state.json");
const lockPath = resolve(stateDir, "run.lock");
const now = new Date();
const startedAt = now.toISOString();
const runId = startedAt.replaceAll(":", "-").replace(".", "-");

if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error("--limit must be an integer from 1 to 100");
}
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
  throw new Error("--timeout-ms must be an integer from 1000 to 120000");
}

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readState(): Promise<MonitorState> {
  if (!(await exists(statePath))) return { version: 1, sources: {} };
  const value = JSON.parse(await readFile(statePath, "utf8")) as MonitorState;
  if (value.version !== 1 || !value.sources) throw new Error("Unsupported source monitor state");
  return value;
}

function activeSources(sources: Source[]) {
  return sources
    .filter(({ status }) => status === "active")
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

function allowedFinalHost(source: Source, finalUrl: URL) {
  if (finalUrl.protocol !== "https:") return false;
  const domains = source.expected_domains?.length
    ? source.expected_domains
    : [new URL(source.url).hostname];
  return domains.some(
    (domain) => finalUrl.hostname === domain || finalUrl.hostname.endsWith(`.${domain}`),
  );
}

function headerValue(headers: Headers, name: string) {
  return headers.get(name) ?? undefined;
}

async function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

async function retainSnapshot(
  source: Source,
  raw: Uint8Array,
  normalized: string,
  state: SourceState,
) {
  const directory = resolve(stateDir, "snapshots", state.snapshot_id);
  if (await exists(directory)) return;
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, "raw.bin"), raw),
    writeFile(resolve(directory, "normalized.txt"), normalized),
    atomicJson(resolve(directory, "metadata.json"), {
      version: 1,
      canonical_url: source.url,
      ...state,
      normalizer: "world-immigrant-html-v1",
    }),
  ]);
}

async function fetchSource(source: Source, previous: SourceState | undefined): Promise<SourceRun> {
  const checkedAt = new Date().toISOString();
  try {
    const sourceUrl = new URL(source.url);
    if (sourceUrl.protocol !== "https:") {
      return {
        source_id: source.id,
        source_url: source.url,
        result: "domain_rejected",
        checked_at: checkedAt,
        error: "Only HTTPS sources are permitted",
      };
    }

    const headers = new Headers({
      Accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.1",
      "User-Agent":
        process.env.SOURCE_MONITOR_USER_AGENT ??
        "WorldImmigrantSourceMonitor/1.0 (+https://world-immigrant.com/sources)",
    });
    if (previous?.etag) headers.set("If-None-Match", previous.etag);
    if (previous?.last_modified) headers.set("If-Modified-Since", previous.last_modified);

    const response = await fetch(sourceUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const finalUrl = new URL(response.url);
    if (!allowedFinalHost(source, finalUrl)) {
      return {
        source_id: source.id,
        source_url: source.url,
        result: "domain_rejected",
        checked_at: checkedAt,
        final_url: response.url,
        status_code: response.status,
        error: "Final redirect host is outside expected_domains",
      };
    }

    if (response.status === 304 && previous) {
      if (!dryRun) {
        state.sources[source.id] = {
          ...previous,
          checked_at: checkedAt,
          final_url: response.url,
          status_code: response.status,
        };
      }
      return {
        source_id: source.id,
        source_url: source.url,
        result: "not_modified",
        checked_at: checkedAt,
        final_url: response.url,
        status_code: response.status,
        content_type: previous.content_type,
        raw_hash: previous.raw_hash,
        normalized_hash: previous.normalized_hash,
        previous_normalized_hash: previous.normalized_hash,
        snapshot_id: previous.snapshot_id,
      };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
    if (declaredLength > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.byteLength > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);

    const contentType =
      response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    const rawHash = sha256(raw);
    const textLike = /^(text\/|application\/(xhtml\+xml|json|xml))/.test(contentType);
    if (!textLike) {
      return {
        source_id: source.id,
        source_url: source.url,
        result: "extraction_required",
        checked_at: checkedAt,
        final_url: response.url,
        status_code: response.status,
        content_type: contentType,
        raw_hash: rawHash,
        error: "Deterministic text extraction is not configured for this content type",
      };
    }

    const normalized = normalizeSourceText(new TextDecoder().decode(raw), contentType);
    if (!normalized) throw new Error("Normalized source text is empty");
    const normalizedHash = sha256(normalized);
    const change = classifyContentChange(previous?.normalized_hash, normalizedHash);
    const lowered = normalized.toLocaleLowerCase("en");
    const expectedHintMisses = (source.expected_content_hints ?? []).filter(
      (hint) => !lowered.includes(hint.toLocaleLowerCase("en")),
    );
    const nextState: SourceState = {
      source_id: source.id,
      checked_at: checkedAt,
      final_url: response.url,
      status_code: response.status,
      content_type: contentType,
      raw_hash: rawHash,
      normalized_hash: normalizedHash,
      snapshot_id: normalizedHash,
      etag: headerValue(response.headers, "etag"),
      last_modified: headerValue(response.headers, "last-modified"),
    };
    if (!dryRun) {
      await retainSnapshot(source, raw, normalized, nextState);
      state.sources[source.id] = nextState;
    }

    return {
      source_id: source.id,
      source_url: source.url,
      result: change,
      checked_at: checkedAt,
      final_url: response.url,
      status_code: response.status,
      content_type: contentType,
      raw_hash: rawHash,
      normalized_hash: normalizedHash,
      previous_normalized_hash: previous?.normalized_hash,
      snapshot_id: normalizedHash,
      expected_hint_misses: expectedHintMisses,
    };
  } catch (error) {
    return {
      source_id: source.id,
      source_url: source.url,
      result: "fetch_failed",
      checked_at: checkedAt,
      error: error instanceof Error ? error.message : "Unknown fetch failure",
    };
  }
}

await mkdir(stateDir, { recursive: true });
let lock: Awaited<ReturnType<typeof open>> | undefined;
let state: MonitorState = { version: 1, sources: {} };
try {
  lock = await open(lockPath, "wx");
  await lock.writeFile(`${process.pid}\n${startedAt}\n`);
  state = await readState();
  const dataset = await loadCanonicalData(root);
  const dueSources = dataset.sources.map((source) => {
    const monitored = state.sources[source.id];
    return monitored ? { ...source, last_success_at: monitored.checked_at } : source;
  });
  const selected = forceAll
    ? activeSources(dataset.sources).slice(0, limit)
    : selectDueSources(dueSources, now, limit);

  const runs: SourceRun[] = [];
  for (const source of selected) {
    runs.push(await fetchSource(source, state.sources[source.id]));
  }

  const counts = Object.fromEntries(
    [...new Set(runs.map(({ result }) => result))]
      .sort()
      .map((result) => [result, runs.filter((run) => run.result === result).length]),
  );
  const requiresAiReview = runs.some((run) =>
    sourceRunRequiresReview(run.result, run.expected_hint_misses),
  );
  const report: RunReport = {
    version: 1,
    run_id: runId,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    dry_run: dryRun,
    selected_source_ids: selected.map(({ id }) => id),
    requires_ai_review: requiresAiReview,
    counts,
    sources: runs,
  };

  if (!dryRun) {
    await mkdir(resolve(stateDir, "runs"), { recursive: true });
    await Promise.all([
      atomicJson(statePath, state),
      atomicJson(resolve(stateDir, "runs", `${runId}.json`), report),
      atomicJson(resolve(stateDir, "latest.json"), report),
    ]);
  }

  if (jsonOnly || dryRun) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `Checked ${runs.length} source(s); review=${requiresAiReview}; report=${resolve(stateDir, "latest.json")}`,
    );
    for (const run of runs) {
      console.log(`- ${run.source_id}: ${run.result}${run.error ? ` (${run.error})` : ""}`);
    }
  }
} finally {
  if (lock) {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
