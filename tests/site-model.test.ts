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
  assert.deepEqual(
    byId.portugal.programs.map(({ id }) => id),
    ["portugal-d8-digital-nomad"],
  );
  assert.deepEqual(
    byId.spain.programs.map(({ id }) => id),
    ["spain-digital-nomad"],
  );
  assert.deepEqual(
    byId.uae.programs.map(({ id }) => id),
    ["uae-remote-work"],
  );
  assert.deepEqual(
    byId.canada.programs.map(({ id }) => id),
    ["canada-express-entry-fsw"],
  );
  assert.deepEqual(
    byId.australia.programs.map(({ id }) => id),
    ["australia-skilled-independent-189"],
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
