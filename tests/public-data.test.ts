import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { buildLlmsDocuments } from "../src/lib/llms";
import { buildPublicData, canonicalGenerationTime } from "../src/lib/public-data";

test("public data generation exposes one complete program through stable indexes", async () => {
  const dataset = await loadCanonicalData();
  assert.equal(canonicalGenerationTime(dataset).toISOString(), "2026-07-10T00:00:00.000Z");
  const output = buildPublicData(dataset, new Date("2026-07-10T12:00:00Z"));

  assert.deepEqual(output.index.counts, {
    categories: 5,
    countries: 1,
    programs: 1,
    sources: 12,
  });
  assert.equal(output.index.generated_at, "2026-07-10T12:00:00.000Z");
  assert.equal(output.filterIndex.programs[0].program_id, "canada-express-entry-fsw");
  assert.equal(output.filterIndex.programs[0].official_names.en, "Federal Skilled Worker Program");
  assert.ok(output.filterIndex.programs[0].field_citations["/filter"].length > 0);
  assert.equal(output.compareIndex.programs[0].pr_pathway.available, true);
  assert.equal(output.compareIndex.programs[0].freshness.needs_human_review, true);
});

test("AI-readable output includes verified programs, freshness, and official sources", async () => {
  const dataset = await loadCanonicalData();
  const output = buildLlmsDocuments(dataset);

  assert.match(output.full, /Federal Skilled Worker Program/);
  assert.match(output.full, /2026-07-10/);
  assert.match(output.full, /canada-ircc-fsw/);
  assert.doesNotMatch(output.full, /No validated program records/);
});
