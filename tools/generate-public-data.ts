import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCanonicalData } from "../src/lib/data";
import { buildPublicData, canonicalGenerationTime } from "../src/lib/public-data";

const root = process.cwd();
const publicDataDir = join(root, "public/data");

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeEntityFiles<T extends { id: string }>(directory: string, entities: T[]) {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await Promise.all(
    entities.map((entity) => writeJson(join(directory, `${entity.id}.json`), entity)),
  );
}

await mkdir(join(publicDataDir, "indexes"), { recursive: true });
const dataset = await loadCanonicalData(root);
const output = buildPublicData(dataset, canonicalGenerationTime(dataset));

await Promise.all([
  writeJson(join(publicDataDir, "index.json"), output.index),
  writeJson(join(publicDataDir, "categories.json"), output.categories),
  writeJson(join(publicDataDir, "countries.json"), output.countries),
  writeJson(join(publicDataDir, "programs.json"), output.programs),
  writeJson(join(publicDataDir, "sources.json"), output.sources),
  writeJson(join(publicDataDir, "indexes/filter-index.v1.json"), output.filterIndex),
  writeJson(join(publicDataDir, "indexes/compare-index.v1.json"), output.compareIndex),
  writeEntityFiles(join(publicDataDir, "countries"), dataset.countries),
  writeEntityFiles(join(publicDataDir, "programs"), dataset.programs),
  writeEntityFiles(join(publicDataDir, "sources"), dataset.sources),
]);

console.log(`Generated static data in ${publicDataDir}`);
