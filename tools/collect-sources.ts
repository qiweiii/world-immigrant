import { resolve as resolveDns } from "node:dns/promises";
import { constants } from "node:fs";
import { access, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { loadCanonicalData } from "../src/lib/data";
import type { Source } from "../src/lib/schema";
import {
  type ContentChangeState,
  classifyContentChange,
  extractPdfText,
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
const maxBytes = Number.parseInt(argument("--max-bytes") ?? "2000000", 10);
const maxRedirects = Number.parseInt(argument("--max-redirects") ?? "5", 10);
const staleLockMs = Number.parseInt(argument("--stale-lock-ms") ?? "900000", 10);
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
if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 10_000_000) {
  throw new Error("--max-bytes must be an integer from 1024 to 10000000");
}
if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 10) {
  throw new Error("--max-redirects must be an integer from 0 to 10");
}
if (!Number.isInteger(staleLockMs) || staleLockMs < 60_000 || staleLockMs > 86_400_000) {
  throw new Error("--stale-lock-ms must be an integer from 60000 to 86400000");
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

function expectedDomains(source: Source) {
  return source.expected_domains?.length ? source.expected_domains : [new URL(source.url).hostname];
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "[::]"
  ) {
    return true;
  }

  const ip = isIP(host.replace(/^\[|\]$/g, "")) ? host.replace(/^\[|\]$/g, "") : null;
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

function hostAllowed(source: Source, url: URL) {
  if (url.protocol !== "https:") return false;
  if (isBlockedHostname(url.hostname)) return false;
  return expectedDomains(source).some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  );
}

async function assertPublicResolvableHost(hostname: string) {
  if (isBlockedHostname(hostname)) {
    throw new Error(`Blocked host ${hostname}`);
  }
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare)) {
    if (isBlockedHostname(bare)) throw new Error(`Blocked address ${bare}`);
    return;
  }
  const records = await resolveDns(hostname);
  if (!records.length) throw new Error(`Host ${hostname} did not resolve`);
  for (const address of records) {
    if (isBlockedHostname(address)) {
      throw new Error(`Host ${hostname} resolves to blocked address ${address}`);
    }
  }
}

function headerValue(headers: Headers, name: string) {
  return headers.get(name) ?? undefined;
}

async function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

async function readBodyLimited(response: Response, limitBytes: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limitBytes) {
      await reader.cancel();
      throw new Error(`Response exceeds ${limitBytes} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function retainSnapshot(
  source: Source,
  raw: Uint8Array,
  normalized: string,
  state: SourceState,
) {
  const directory = resolve(stateDir, "snapshots", state.snapshot_id);
  const completeMarker = resolve(directory, "metadata.json");
  if (await exists(completeMarker)) return;

  const temporary = resolve(stateDir, "snapshots", `.tmp-${state.snapshot_id}-${process.pid}`);
  await rm(temporary, { recursive: true, force: true });
  await mkdir(temporary, { recursive: true });
  await Promise.all([
    writeFile(resolve(temporary, "raw.bin"), raw),
    writeFile(resolve(temporary, "normalized.txt"), normalized),
    atomicJson(resolve(temporary, "metadata.json"), {
      version: 1,
      canonical_url: source.url,
      ...state,
      normalizer: "world-immigrant-html-v1",
    }),
  ]);
  await rm(directory, { recursive: true, force: true });
  await rename(temporary, directory);
}

async function acquireLock() {
  await mkdir(stateDir, { recursive: true });
  try {
    const lock = await open(lockPath, "wx");
    await lock.writeFile(`${process.pid}\n${startedAt}\n`);
    return lock;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    const existing = await readFile(lockPath, "utf8").catch(() => "");
    const stampedAt = existing.split("\n")[1]?.trim();
    const age = stampedAt ? Date.now() - new Date(stampedAt).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(age) && age < staleLockMs) {
      throw new Error(`Source monitor already running (lock age ${Math.round(age / 1000)}s)`);
    }
    await rm(lockPath, { force: true });
    const lock = await open(lockPath, "wx");
    await lock.writeFile(`${process.pid}\n${startedAt}\n`);
    return lock;
  }
}

async function fetchWithValidatedRedirects(source: Source, previous: SourceState | undefined) {
  let currentUrl = new URL(source.url);
  if (!hostAllowed(source, currentUrl)) {
    throw Object.assign(new Error("Initial URL host is outside expected_domains"), {
      result: "domain_rejected" as const,
    });
  }
  await assertPublicResolvableHost(currentUrl.hostname);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const headers = new Headers({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
      "Accept-Language": "en-AU,en;q=0.9",
      "User-Agent":
        process.env.SOURCE_MONITOR_USER_AGENT ??
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    if (previous?.etag) headers.set("If-None-Match", previous.etag);
    if (previous?.last_modified) headers.set("If-Modified-Since", previous.last_modified);

    const response = await fetch(currentUrl, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect ${response.status} without Location`);
      const nextUrl = new URL(location, currentUrl);
      if (!hostAllowed(source, nextUrl)) {
        throw Object.assign(
          new Error(`Redirect host is outside expected_domains: ${nextUrl.hostname}`),
          {
            result: "domain_rejected" as const,
            finalUrl: nextUrl.toString(),
            status: response.status,
          },
        );
      }
      await assertPublicResolvableHost(nextUrl.hostname);
      currentUrl = nextUrl;
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error(`Exceeded ${maxRedirects} redirects`);
}

async function fetchSource(source: Source, previous: SourceState | undefined): Promise<SourceRun> {
  const checkedAt = new Date().toISOString();
  try {
    const { response, finalUrl } = await fetchWithValidatedRedirects(source, previous);

    if (response.status === 304 && previous) {
      if (!dryRun) {
        state.sources[source.id] = {
          ...previous,
          checked_at: checkedAt,
          final_url: finalUrl.toString(),
          status_code: response.status,
        };
      }
      return {
        source_id: source.id,
        source_url: source.url,
        result: "not_modified",
        checked_at: checkedAt,
        final_url: finalUrl.toString(),
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
    const raw = await readBodyLimited(response, maxBytes);

    const contentType =
      response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    const rawHash = sha256(raw);
    const textLike = /^(text\/|application\/(xhtml\+xml|json|xml))/.test(contentType);
    let sourceText: string;
    if (textLike) {
      sourceText = new TextDecoder().decode(raw);
    } else if (source.extraction_method === "pdf" && contentType === "application/pdf") {
      sourceText = await extractPdfText(raw, maxBytes * 4);
    } else {
      return {
        source_id: source.id,
        source_url: source.url,
        result: "extraction_required",
        checked_at: checkedAt,
        final_url: finalUrl.toString(),
        status_code: response.status,
        content_type: contentType,
        raw_hash: rawHash,
        error: "Deterministic text extraction is not configured for this content type",
      };
    }

    const normalized = normalizeSourceText(sourceText, textLike ? contentType : "text/plain");
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
      final_url: finalUrl.toString(),
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
      final_url: finalUrl.toString(),
      status_code: response.status,
      content_type: contentType,
      raw_hash: rawHash,
      normalized_hash: normalizedHash,
      previous_normalized_hash: previous?.normalized_hash,
      snapshot_id: normalizedHash,
      expected_hint_misses: expectedHintMisses,
    };
  } catch (error) {
    const result =
      error && typeof error === "object" && "result" in error
        ? (error as { result: SourceRun["result"] }).result
        : "fetch_failed";
    return {
      source_id: source.id,
      source_url: source.url,
      result,
      checked_at: checkedAt,
      final_url:
        error && typeof error === "object" && "finalUrl" in error
          ? String((error as { finalUrl: string }).finalUrl)
          : undefined,
      status_code:
        error && typeof error === "object" && "status" in error
          ? Number((error as { status: number }).status)
          : undefined,
      error: error instanceof Error ? error.message : "Unknown fetch failure",
    };
  }
}

await mkdir(stateDir, { recursive: true });
let lock: Awaited<ReturnType<typeof open>> | undefined;
let state: MonitorState = { version: 1, sources: {} };
try {
  lock = await acquireLock();
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
