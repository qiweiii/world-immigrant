import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import {
  type Category,
  type Country,
  categorySchema,
  countrySchema,
  type Program,
  programSchema,
  type Source,
  sourceSchema,
} from "./schema";

export type CanonicalDataset = {
  categories: Category[];
  countries: Country[];
  programs: Program[];
  sources: Source[];
};

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function loadEntityDirectory<T>(
  directory: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const entities = await Promise.all(
    names.map(async (name) => schema.parse(await readJson(join(directory, name)))),
  );

  return entities.sort((left, right) => {
    const leftId = (left as { id?: string }).id ?? "";
    const rightId = (right as { id?: string }).id ?? "";
    return leftId.localeCompare(rightId);
  });
}

export async function loadCanonicalData(root = process.cwd()): Promise<CanonicalDataset> {
  const categoriesFile = categorySchema
    .array()
    .parse(
      ((await readJson(join(root, "src/data/categories.json"))) as { categories?: unknown })
        .categories,
    );

  const [countries, programs, sources] = await Promise.all([
    loadEntityDirectory(join(root, "src/data/countries"), countrySchema),
    loadEntityDirectory(join(root, "src/data/programs"), programSchema),
    loadEntityDirectory(join(root, "src/data/sources"), sourceSchema),
  ]);

  return {
    categories: categoriesFile.sort((left, right) => left.id.localeCompare(right.id)),
    countries,
    programs,
    sources,
  };
}
