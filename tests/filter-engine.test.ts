import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { evaluateProgram, evaluatePrograms, type UserProfile } from "../src/lib/filter-engine";
import { buildPublicData } from "../src/lib/public-data";

const completeProfile: UserProfile = {
  goal: "permanent_residence",
  skilled_work_years: 3,
  has_approved_language_test: true,
  language_benchmark: 8,
  education_level: "bachelor",
  foreign_education: true,
  has_eca: true,
  program_selection_points: 72,
  family_size: 1,
  liquid_funds: { amount: 20000, currency: "CAD" },
  authorized_to_work_in_country: false,
  valid_job_offer: false,
};

async function indexProgram(programId = "canada-express-entry-fsw") {
  const output = buildPublicData(await loadCanonicalData());
  const program = output.filterIndex.programs.find((item) => item.program_id === programId);
  if (!program) throw new Error(`missing filter index program ${programId}`);
  return program;
}

test("filter returns not_match for a cited hard blocker", async () => {
  const program = await indexProgram();
  const result = evaluateProgram(program, { ...completeProfile, skilled_work_years: 0 });

  assert.equal(result.status, "not_match");
  assert.ok(
    result.reasons.some(
      ({ field, severity }) => field === "work_experience" && severity === "blocking",
    ),
  );
  assert.ok(result.reasons.every(({ citations }) => citations.length > 0));
});

test("filter returns possible_match when a non-critical profile fact is missing", async () => {
  const program = structuredClone(await indexProgram());
  program.freshness.needs_human_review = false;
  const profile = { ...completeProfile, family_size: undefined, liquid_funds: undefined };
  const result = evaluateProgram(program, profile);

  assert.equal(result.status, "possible_match");
  assert.ok(result.reasons.some(({ field }) => field === "settlement_funds"));
});

test("filter returns possible_match when a program-specific selection score is missing", async () => {
  const program = structuredClone(await indexProgram());
  program.freshness.needs_human_review = false;
  const result = evaluateProgram(program, {
    ...completeProfile,
    program_selection_points: undefined,
  });

  assert.equal(result.status, "possible_match");
  assert.ok(result.reasons.some(({ field }) => field === "program_selection_points"));
});

test("filter can narrow results by pathway category", async () => {
  const output = buildPublicData(await loadCanonicalData());
  const all = evaluatePrograms(output.filterIndex.programs, completeProfile);
  const studyOnly = evaluatePrograms(output.filterIndex.programs, {
    ...completeProfile,
    category_ids: ["study_to_pr"],
  });
  assert.ok(all.length > studyOnly.length);
  assert.ok(studyOnly.length > 0);
  for (const result of studyOnly) {
    const program = output.filterIndex.programs.find(
      (item) => item.program_id === result.program_id,
    );
    assert.ok(program?.category_ids.includes("study_to_pr"));
  }
});

test("filter returns likely_match only when known checks pass and content is reviewed", async () => {
  const program = structuredClone(await indexProgram());
  program.freshness.needs_human_review = false;

  const result = evaluateProgram(program, completeProfile);

  assert.equal(result.status, "likely_match");
  assert.ok(result.score >= 80);
});

test("filter preserves unknown policy state instead of guessing", async () => {
  const program = structuredClone(await indexProgram());
  program.leads_to_pr = "unknown";
  program.freshness.needs_human_review = false;

  const result = evaluateProgram(program, completeProfile);

  assert.equal(result.status, "unknown");
  assert.ok(result.reasons.some(({ severity }) => severity === "unknown"));
});

test("filter marks inactive programs as needs_review", async () => {
  const program = structuredClone(await indexProgram());
  program.status = "closed";
  program.freshness.needs_human_review = false;
  const result = evaluateProgram(program, completeProfile);
  assert.equal(result.status, "needs_review");
  assert.ok(result.reasons.some(({ field }) => field === "program_status"));
});

test("filter attaches field-specific citations rather than one global source list", async () => {
  const program = await indexProgram();
  const result = evaluateProgram(program, { ...completeProfile, skilled_work_years: 0 });
  const work = result.reasons.find(({ field }) => field === "work_experience");
  assert.ok(work);
  assert.ok(work.citations.some((c) => c.source_id === "canada-ircc-fsw"));
  const funds = evaluateProgram(program, {
    ...completeProfile,
    family_size: 1,
    liquid_funds: { amount: 1, currency: "CAD" },
  }).reasons.find(({ field }) => field === "settlement_funds");
  assert.ok(funds);
  assert.ok(funds.citations.some((c) => c.source_id === "canada-ircc-proof-funds"));
});

test("temporary-stay goal positively matches a temporary mobility pathway", async () => {
  const program = structuredClone(await indexProgram("malaysia-de-rantau-nomad-pass"));
  program.freshness.needs_human_review = false;

  const result = evaluateProgram(program, { ...completeProfile, goal: "temporary_stay" });

  assert.ok(
    result.reasons.some(
      ({ field, severity, message }) =>
        field === "goal" && severity === "positive" && message.includes("temporary"),
    ),
  );
});

test("temporary-stay goal keeps settlement pathways visible with a caveat", async () => {
  const program = structuredClone(await indexProgram());
  program.freshness.needs_human_review = false;

  const result = evaluateProgram(program, { ...completeProfile, goal: "temporary_stay" });

  assert.ok(
    result.reasons.some(({ field, severity }) => field === "goal" && severity === "warning"),
  );
  assert.equal(
    result.reasons.some(({ field, severity }) => field === "goal" && severity === "blocking"),
    false,
  );
});

test("temporary-stay goal preserves unknown policy state", async () => {
  const program = structuredClone(await indexProgram());
  program.pathway_type = "unknown";
  program.settlement_track = "unknown";
  program.freshness.needs_human_review = false;

  const result = evaluateProgram(program, { ...completeProfile, goal: "temporary_stay" });

  assert.ok(
    result.reasons.some(({ field, severity }) => field === "goal" && severity === "unknown"),
  );
});

test("temporary-stay ranking excludes direct residence pathways", async () => {
  const temporary = await indexProgram("malaysia-de-rantau-nomad-pass");
  const permanent = await indexProgram();
  const results = evaluatePrograms([temporary, permanent], {
    ...completeProfile,
    goal: "temporary_stay",
  });

  assert.deepEqual(
    results.map(({ program_id }) => program_id),
    ["malaysia-de-rantau-nomad-pass"],
  );
});
