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
  sources: Record<string, { snapshot_id: string }>;
};
const dataset = await loadCanonicalData(root);
const normalizedBySnapshot = new Map<string, string>();
const errors: string[] = [];
let checkedQuotes = 0;
let checkedCitations = 0;

async function normalizedSnapshot(snapshotId: string) {
  const cached = normalizedBySnapshot.get(snapshotId);
  if (cached) return cached;
  const text = await readFile(resolve(stateDir, "snapshots", snapshotId, "normalized.txt"), "utf8");
  normalizedBySnapshot.set(snapshotId, text);
  return text;
}

for (const program of dataset.programs) {
  for (const [path, citations] of Object.entries(program.field_citations)) {
    for (const citation of citations) {
      checkedCitations += 1;
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
        const normalized = await normalizedSnapshot(snapshotId);
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
