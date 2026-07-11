import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { buildCountryPageModels, buildProgramPageModels } from "../src/lib/site-model";

test("country and program page models resolve canonical relationships", async () => {
  const dataset = await loadCanonicalData();

  const countries = buildCountryPageModels(dataset);
  const programs = buildProgramPageModels(dataset);
  const byId = Object.fromEntries(countries.map((model) => [model.country.id, model]));

  assert.equal(countries.length, dataset.countries.length);
  assert.ok(byId.canada);
  assert.ok(byId.australia);
  assert.ok(byId.portugal);
  assert.ok(byId.spain);
  assert.ok(byId.uae);
  assert.ok(byId["new-zealand"]);
  assert.ok(byId.estonia);
  assert.ok(byId.netherlands);
  assert.ok(byId.croatia);
  assert.deepEqual(
    byId.portugal.programs.map(({ id }) => id),
    [
      "portugal-d8-digital-nomad",
      "portugal-employed-worker-residence",
      "portugal-student-residence",
    ],
  );
  assert.deepEqual(
    byId["united-states"].programs.map(({ id }) => id),
    ["united-states-h1b-specialty-occupations", "united-states-f1-student", "united-states-opt-f1"],
  );
  assert.deepEqual(
    byId.spain.programs.map(({ id }) => id),
    ["spain-digital-nomad", "spain-highly-qualified-professionals", "spain-study-stay"],
  );
  assert.deepEqual(
    byId.uae.programs.map(({ id }) => id),
    [
      "uae-remote-work",
      "uae-free-zone-investor",
      "uae-green-freelancer",
      "uae-golden-property-investor",
      "uae-golden-talent",
      "uae-golden-entrepreneur",
    ],
  );
  assert.deepEqual(
    byId.singapore.programs.map(({ id }) => id),
    ["singapore-employment-pass", "singapore-entrepass", "singapore-student-pass"],
  );
  assert.deepEqual(
    byId["new-zealand"].programs.map(({ id }) => id),
    [
      "new-zealand-accredited-employer-work-visa",
      "new-zealand-skilled-migrant-category",
      "new-zealand-fee-paying-student",
    ],
  );
  assert.deepEqual(
    byId.estonia.programs.map(({ id }) => id),
    ["estonia-e-residency", "estonia-digital-nomad-visa"],
  );
  assert.deepEqual(
    byId.netherlands.programs.map(({ id }) => id),
    ["netherlands-highly-skilled-migrant", "netherlands-orientation-year"],
  );
  assert.deepEqual(
    byId.croatia.programs.map(({ id }) => id),
    ["croatia-digital-nomad", "croatia-eu-blue-card"],
  );
  assert.deepEqual(
    byId["hong-kong"].programs.map(({ id }) => id),
    ["hong-kong-top-talent-pass", "hong-kong-student"],
  );
  assert.deepEqual(
    byId.canada.programs.map(({ id }) => id),
    [
      "canada-express-entry-fsw",
      "canada-express-entry-cec",
      "canada-study-permit",
      "canada-post-graduation-work-permit",
    ],
  );
  assert.deepEqual(
    byId.australia.programs.map(({ id }) => id),
    [
      "australia-skilled-independent-189",
      "australia-skills-in-demand-482",
      "australia-student-500",
      "australia-temporary-graduate-485",
    ],
  );
  assert.deepEqual(
    byId["united-kingdom"].programs.map(({ id }) => id),
    [
      "united-kingdom-skilled-worker",
      "united-kingdom-student-visa",
      "united-kingdom-graduate-visa",
    ],
  );
  assert.deepEqual(
    byId.germany.programs.map(({ id }) => id),
    ["germany-eu-blue-card", "germany-opportunity-card", "germany-student-residence"],
  );
  assert.deepEqual(
    byId.japan.programs.map(({ id }) => id),
    ["japan-engineer-specialist", "japan-student", "japan-digital-nomad"],
  );
  assert.equal(programs.length, dataset.programs.length);
  const canadaProgram = programs.find((model) => model.program.id === "canada-express-entry-fsw");
  const australiaProgram = programs.find(
    (model) => model.program.id === "australia-skilled-independent-189",
  );
  assert.equal(canadaProgram?.country.names.en, "Canada");
  assert.equal(canadaProgram?.sources.length, 12);
  assert.equal(australiaProgram?.country.names.en, "Australia");
  assert.equal(australiaProgram?.sources.length, 7);
  assert.ok(canadaProgram?.citations.some(({ path }) => path === "/eligibility"));
});
