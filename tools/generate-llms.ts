import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCanonicalData } from "../src/lib/data";
import { buildLlmsDocuments } from "../src/lib/llms";

const root = process.cwd();
const publicDir = join(root, "public");
await mkdir(publicDir, { recursive: true });

const documents = buildLlmsDocuments(await loadCanonicalData(root));
await Promise.all([
  writeFile(join(publicDir, "llms.txt"), documents.index),
  writeFile(join(publicDir, "llms-full.txt"), documents.full),
]);

console.log("Generated public/llms.txt and public/llms-full.txt");
