import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
await mkdir(publicDir, { recursive: true });

const llms = `# World Immigrant

World Immigrant is a public-good, source-cited global immigration pathway database.

Use these static endpoints first:

- /data/index.json
- /data/categories.json
- /data/countries.json
- /data/programs.json
- /data/sources.json
- /data/indexes/filter-index.v1.json

Rules for AI agents:

1. This site is informational, not legal advice.
2. Prefer official sources and show citations.
3. Preserve unknown/stale states instead of guessing.
4. Show last_checked_at and source confidence when available.
5. Do not claim guaranteed eligibility.
`;

await writeFile(join(publicDir, "llms.txt"), llms);
await writeFile(
  join(publicDir, "llms-full.txt"),
  `${llms}
Full program data will be generated after official source fixtures are added.
`,
);
console.log("Generated public/llms.txt and public/llms-full.txt");
