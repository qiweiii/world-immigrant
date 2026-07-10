import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadCanonicalData } from "../src/lib/data";
import { normalizedIncludesQuote, sha256 } from "../src/lib/sourceMonitor";

const args = process.argv.slice(2);
const requireSnapshotIds = args.includes("--require-snapshot-ids");
const root = process.cwd();
const stateDir = resolve(
  process.env.WORLD_IMMIGRANT_SOURCE_STATE_DIR ?? resolve(root, ".source-monitor"),
);
const state = JSON.parse(await readFile(resolve(stateDir, "state.json"), "utf8")) as {
  sources: Record<string, { snapshot_id: string; normalized_hash?: string; final_url?: string }>;
};
const dataset = await loadCanonicalData(root);
const sourceById = new Map(dataset.sources.map((source) => [source.id, source]));
const normalizedBySnapshot = new Map<string, string>();
const metadataBySnapshot = new Map<string, Record<string, unknown>>();
const errors: string[] = [];
let checkedQuotes = 0;
let checkedCitations = 0;

async function loadSnapshot(snapshotId: string) {
  const cachedText = normalizedBySnapshot.get(snapshotId);
  const cachedMeta = metadataBySnapshot.get(snapshotId);
  if (cachedText && cachedMeta) return { text: cachedText, metadata: cachedMeta };

  const base = resolve(stateDir, "snapshots", snapshotId);
  const [text, metadataRaw] = await Promise.all([
    readFile(resolve(base, "normalized.txt"), "utf8"),
    readFile(resolve(base, "metadata.json"), "utf8"),
  ]);
  const metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
  normalizedBySnapshot.set(snapshotId, text);
  metadataBySnapshot.set(snapshotId, metadata);
  return { text, metadata };
}

for (const program of dataset.programs) {
  for (const [path, citations] of Object.entries(program.field_citations)) {
    for (const citation of citations) {
      checkedCitations += 1;
      const source = sourceById.get(citation.source_id);
      if (!source) {
        errors.push(`${program.id} ${path}: citation source ${citation.source_id} is unknown`);
        continue;
      }
      const current = state.sources[citation.source_id];
      if (!current) {
        errors.push(`${program.id} ${path}: no retained snapshot for ${citation.source_id}`);
        continue;
      }
      const snapshotId = citation.snapshot_id ?? current.snapshot_id;
      if (requireSnapshotIds && !citation.snapshot_id) {
        errors.push(`${program.id} ${path}: citation ${citation.source_id} lacks snapshot_id`);
      }
      try {
        const { text: normalized, metadata } = await loadSnapshot(snapshotId);
        if (metadata.source_id && metadata.source_id !== citation.source_id) {
          errors.push(
            `${program.id} ${path}: snapshot ${snapshotId} belongs to ${String(metadata.source_id)}, not ${citation.source_id}`,
          );
        }
        if (metadata.snapshot_id && metadata.snapshot_id !== snapshotId) {
          errors.push(`${program.id} ${path}: snapshot metadata id mismatch for ${snapshotId}`);
        }
        if (
          typeof metadata.normalized_hash === "string" &&
          metadata.normalized_hash !== sha256(normalized)
        ) {
          errors.push(`${program.id} ${path}: snapshot ${snapshotId} hash does not match content`);
        }
        if (
          typeof metadata.canonical_url === "string" &&
          metadata.canonical_url !== source.url &&
          metadata.canonical_url !== citation.url
        ) {
          errors.push(
            `${program.id} ${path}: snapshot ${snapshotId} URL does not match source or citation`,
          );
        }
        if (citation.quote_md) {
          checkedQuotes += 1;
          if (!normalizedIncludesQuote(normalized, citation.quote_md)) {
            errors.push(`${program.id} ${path}: quote is not verbatim in snapshot ${snapshotId}`);
          }
          if (
            citation.quote_hash &&
            citation.quote_hash !== sha256(citation.quote_md.normalize("NFKC"))
          ) {
            errors.push(`${program.id} ${path}: quote_hash does not match quote_md`);
          }
        }
      } catch (error) {
        errors.push(
          `${program.id} ${path}: snapshot ${snapshotId} cannot be read (${error instanceof Error ? error.message : "unknown error"})`,
        );
      }
    }
  }
}

if (errors.length) {
  throw new Error(
    `Evidence verification failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}

console.log(
  `Verified ${checkedCitations} citations and ${checkedQuotes} verbatim quotes against retained snapshots.`,
);
