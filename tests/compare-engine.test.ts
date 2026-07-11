import assert from "node:assert/strict";
import test from "node:test";
import { buildComparison } from "../src/lib/compareEngine";
import { loadCanonicalData } from "../src/lib/data";
import { buildPublicData } from "../src/lib/public-data";

async function comparePrograms() {
  return buildPublicData(await loadCanonicalData()).compareIndex.programs;
}

test("compare engine resolves stable rows and preserves evidence metadata", async () => {
  const programs = await comparePrograms();
  const view = buildComparison(programs, ["canada-express-entry-fsw"]);

  assert.deepEqual(
    view.columns.map(({ id }) => id),
    ["canada-express-entry-fsw"],
  );
  assert.deepEqual(
    view.rows.map(({ id }) => id),
    [
      "settlement_track",
      "pathway_mechanism",
      "pathway",
      "job_offer",
      "income",
      "settlement_funds",
      "processing_time",
      "work_rights",
      "family",
      "citizenship",
      "source_confidence",
      "last_checked",
    ],
  );
  const pathwayRow = view.rows.find((row) => row.id === "pathway");
  assert.ok(pathwayRow);
  assert.match(pathwayRow.cells[0].display, /Direct permanent residence/);
  assert.ok(pathwayRow.cells[0].citations.length > 0);
  assert.match(
    view.rows.find((row) => row.id === "pathway_mechanism")?.cells[0].display ?? "",
    /points invitation/,
  );
});

test("compare engine aligns a synthetic second program and displays unknown explicitly", async () => {
  const programs = await comparePrograms();
  const synthetic = structuredClone(programs[0]);
  synthetic.program_id = "test-program";
  synthetic.official_names = { en: "Test Program" };
  synthetic.timeline.processing_time_months_min = "unknown";
  synthetic.timeline.processing_time_months_max = "unknown";

  const view = buildComparison(
    [...programs, synthetic],
    ["canada-express-entry-fsw", "test-program"],
  );

  const processing = view.rows.find(({ id }) => id === "processing_time");
  assert.equal(processing?.cells.length, 2);
  assert.match(processing?.cells[1].display ?? "", /Unknown/);
});

test("compare engine rejects unknown program IDs", async () => {
  const programs = await comparePrograms();
  assert.throws(() => buildComparison(programs, ["missing"]), /Unknown program/);
});

test("compare engine deduplicates program IDs and rejects more than three distinct programs", async () => {
  const programs = await comparePrograms();
  const view = buildComparison(programs, ["canada-express-entry-fsw", "canada-express-entry-fsw"]);
  assert.equal(view.columns.length, 1);

  const clones = Array.from({ length: 3 }, (_, index) => {
    const program = structuredClone(programs[0]);
    program.program_id = `extra-${index}`;
    program.official_names = { en: `Extra ${index}` };
    return program;
  });
  assert.throws(
    () =>
      buildComparison(
        [...programs, ...clones],
        ["canada-express-entry-fsw", "extra-0", "extra-1", "extra-2"],
      ),
    /at most three/,
  );
});
