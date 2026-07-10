import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const publicDataDir = join(root, "public/data");

async function readJson(path: string) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

await mkdir(join(publicDataDir, "indexes"), { recursive: true });

const [categories, countries, programs, sources] = await Promise.all([
  readJson("src/data/categories.json"),
  readJson("src/data/countries.json"),
  readJson("src/data/programs.json"),
  readJson("src/data/sources.json"),
]);

await writeFile(
  join(publicDataDir, "index.json"),
  `${JSON.stringify(
    {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      endpoints: {
        categories: "/data/categories.json",
        countries: "/data/countries.json",
        programs: "/data/programs.json",
        sources: "/data/sources.json",
        filter_index: "/data/indexes/filter-index.v1.json",
      },
    },
    null,
    2,
  )}
`,
);
await writeFile(
  join(publicDataDir, "categories.json"),
  `${JSON.stringify(categories, null, 2)}
`,
);
await writeFile(
  join(publicDataDir, "countries.json"),
  `${JSON.stringify(countries, null, 2)}
`,
);
await writeFile(
  join(publicDataDir, "programs.json"),
  `${JSON.stringify(programs, null, 2)}
`,
);
await writeFile(
  join(publicDataDir, "sources.json"),
  `${JSON.stringify(sources, null, 2)}
`,
);
await writeFile(
  join(publicDataDir, "indexes/filter-index.v1.json"),
  `${JSON.stringify({ schema_version: 1, programs: [] }, null, 2)}
`,
);

console.log(`Generated static data in ${publicDataDir}`);
