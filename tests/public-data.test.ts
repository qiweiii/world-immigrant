import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { buildLlmsDocuments } from "../src/lib/llms";
import { buildPublicData, canonicalGenerationTime } from "../src/lib/public-data";

test("public data generation exposes one complete program through stable indexes", async () => {
  const dataset = await loadCanonicalData();
  const expectedGenerationTime = Math.max(
    ...[
      ...dataset.countries.flatMap(({ freshness }) => [
        freshness.updated_at,
        freshness.last_checked_at,
      ]),
      ...dataset.programs.flatMap(({ freshness }) => [
        freshness.updated_at,
        freshness.last_checked_at,
      ]),
      ...dataset.sources.flatMap(({ last_success_at, last_checked_at }) =>
        [last_success_at, last_checked_at].filter((value): value is string => Boolean(value)),
      ),
    ].map((value) => Date.parse(value)),
  );
  assert.equal(canonicalGenerationTime(dataset).getTime(), expectedGenerationTime);
  const output = buildPublicData(dataset, new Date("2026-07-10T12:00:00Z"));

  assert.deepEqual(output.index.counts, {
    categories: 5,
    countries: 16,
    programs: 32,
    sources: 78,
  });
  assert.equal(output.index.generated_at, "2026-07-10T12:00:00.000Z");
  const canada = output.filterIndex.programs.find(
    (program) => program.program_id === "canada-express-entry-fsw",
  );
  const australia = output.filterIndex.programs.find(
    (program) => program.program_id === "australia-skilled-independent-189",
  );
  assert.ok(canada);
  assert.ok(australia);
  assert.equal(canada.official_names.en, "Federal Skilled Worker Program");
  assert.deepEqual(canada.country_names, { en: "Canada", "zh-Hans": "加拿大" });
  assert.ok(canada.field_citations["/filter"].length > 0);
  assert.equal(
    output.compareIndex.programs.find(
      (program) => program.program_id === "canada-express-entry-fsw",
    )?.pr_pathway.available,
    true,
  );
  assert.equal(australia.freshness.needs_human_review, true);
});

test("AI-readable output includes programs, freshness, and official sources", async () => {
  const dataset = await loadCanonicalData();
  const output = buildLlmsDocuments(dataset);

  assert.match(output.full, /Federal Skilled Worker Program/);
  assert.match(output.full, /Skilled Independent visa/);
  assert.match(output.full, /2026-07-10/);
  assert.match(output.full, /canada-ircc-fsw/);
  assert.match(output.full, /australia-home-affairs-189/);
  assert.doesNotMatch(output.full, /No validated program records/);
});
