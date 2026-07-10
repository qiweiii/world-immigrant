import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { buildCountryPageModels, buildProgramPageModels } from "../src/lib/site-model";

test("country and program page models resolve canonical relationships", async () => {
  const dataset = await loadCanonicalData();

  const countries = buildCountryPageModels(dataset);
  const programs = buildProgramPageModels(dataset);

  assert.equal(countries.length, 1);
  assert.equal(countries[0].country.id, "canada");
  assert.deepEqual(
    countries[0].programs.map(({ id }) => id),
    ["canada-express-entry-fsw"],
  );
  assert.equal(programs.length, 1);
  assert.equal(programs[0].country.names.en, "Canada");
  assert.equal(programs[0].sources.length, 12);
  assert.ok(programs[0].citations.some(({ path }) => path === "/eligibility"));
});
