import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import { evaluateProgram, type UserProfile } from "../src/lib/filterEngine";
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
  assert.ok(program, `missing filter index program ${programId}`);
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

test("filter returns needs_review when a program-specific selection score is missing", async () => {
  const program = await indexProgram();
  const result = evaluateProgram(program, {
    ...completeProfile,
    program_selection_points: undefined,
  });

  assert.equal(result.status, "needs_review");
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
  assert.ok(work.citations.includes("canada-ircc-fsw"));
  const funds = evaluateProgram(program, {
    ...completeProfile,
    family_size: 1,
    liquid_funds: { amount: 1, currency: "CAD" },
  }).reasons.find(({ field }) => field === "settlement_funds");
  assert.ok(funds);
  assert.ok(funds.citations.includes("canada-ircc-proof-funds"));
});
