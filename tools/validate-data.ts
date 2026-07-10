import { loadCanonicalData } from "../src/lib/data";
import { validateDataset } from "../src/lib/validation";

const strictFreshness = process.argv.includes("--strict-freshness");
const dataset = await loadCanonicalData();
const result = validateDataset(dataset, { strictFreshness });

for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
if (result.errors.length > 0) {
  throw new Error(`Data validation failed:\n- ${result.errors.join("\n- ")}`);
}

console.log(
  `Validated ${dataset.categories.length} categories, ${dataset.countries.length} countries, ${dataset.programs.length} programs, ${dataset.sources.length} sources${strictFreshness ? " with strict freshness" : ""}.`,
);
