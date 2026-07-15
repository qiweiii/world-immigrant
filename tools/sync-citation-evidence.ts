import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizedIncludesQuote, sha256 } from "../src/lib/source-monitor";

const write = process.argv.includes("--write");
const root = process.cwd();
const stateDir = resolve(
  process.env.WORLD_IMMIGRANT_SOURCE_STATE_DIR ?? resolve(root, ".source-monitor"),
);
const state = JSON.parse(await readFile(resolve(stateDir, "state.json"), "utf8")) as {
  sources: Record<string, { snapshot_id: string }>;
};
const directory = resolve(root, "src/data/programs");
const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
const snapshots = new Map<string, string>();
let annotated = 0;
let removedParaphrases = 0;

async function snapshotText(snapshotId: string) {
  const cached = snapshots.get(snapshotId);
  if (cached) return cached;
  const text = await readFile(resolve(stateDir, "snapshots", snapshotId, "normalized.txt"), "utf8");
  snapshots.set(snapshotId, text);
  return text;
}

for (const file of files) {
  const path = resolve(directory, file);
  const program = JSON.parse(await readFile(path, "utf8")) as {
    field_citations: Record<
      string,
      Array<{
        source_id: string;
        section?: string;
        quote_md?: string;
        snapshot_id?: string;
        quote_hash?: string;
      }>
    >;
  };

  for (const citations of Object.values(program.field_citations)) {
    for (const citation of citations) {
      const sourceState = state.sources[citation.source_id];
      if (!sourceState) throw new Error(`No current snapshot for ${citation.source_id}`);
      citation.snapshot_id = sourceState.snapshot_id;
      annotated += 1;
      if (citation.quote_md) {
        const snapshot = await snapshotText(sourceState.snapshot_id);
        if (normalizedIncludesQuote(snapshot, citation.quote_md)) {
          citation.quote_hash = sha256(citation.quote_md.normalize("NFKC"));
        } else {
          delete citation.quote_md;
          delete citation.quote_hash;
          removedParaphrases += 1;
          if (!citation.section) {
            throw new Error(
              `${file}: removing a paraphrase would leave a citation without a locator`,
            );
          }
        }
      }
    }
  }

  if (write) await writeFile(path, `${JSON.stringify(program, null, 2)}\n`);
}

console.log(
  `${write ? "Annotated" : "Would annotate"} ${annotated} citations; ${write ? "removed" : "would remove"} ${removedParaphrases} non-verbatim quote fields.`,
);
