import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { categorySchema, countrySchema, programSchema, sourceSchema } from "../src/lib/schema";

const root = process.cwd();

async function readJson<T>(path: string): Promise<T> {
  const text = await readFile(join(root, path), "utf8");
  return JSON.parse(text) as T;
}

const categoriesFile = await readJson<{ categories: unknown[] }>("src/data/categories.json");
const countriesFile = await readJson<{ countries: unknown[] }>("src/data/countries.json");
const programsFile = await readJson<{ programs: unknown[] }>("src/data/programs.json");
const sourcesFile = await readJson<{ sources: unknown[] }>("src/data/sources.json");

const categories = categoriesFile.categories.map((entry) => categorySchema.parse(entry));
const countries = countriesFile.countries.map((entry) => countrySchema.parse(entry));
const programs = programsFile.programs.map((entry) => programSchema.parse(entry));
const sources = sourcesFile.sources.map((entry) => sourceSchema.parse(entry));

const categoryIds = new Set(categories.map((category) => category.id));
const countryIds = new Set(countries.map((country) => country.id));
const sourceIds = new Set(sources.map((source) => source.id));

for (const program of programs) {
  if (!countryIds.has(program.country_id)) {
    throw new Error(`Program ${program.id} references missing country ${program.country_id}`);
  }

  for (const categoryId of program.category_ids) {
    if (!categoryIds.has(categoryId)) {
      throw new Error(`Program ${program.id} references missing category ${categoryId}`);
    }
  }

  if (program.status === "active" && program.source_ids.length === 0) {
    throw new Error(`Active program ${program.id} must have at least one source`);
  }

  for (const sourceId of program.source_ids) {
    if (!sourceIds.has(sourceId)) {
      throw new Error(`Program ${program.id} references missing source ${sourceId}`);
    }
  }
}

console.log(
  `Validated ${categories.length} categories, ${countries.length} countries, ${programs.length} programs, ${sources.length} sources.`,
);
