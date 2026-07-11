import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { loadEntityDirectory } from "../src/lib/data";
import { evaluateFreshness, validateDataset } from "../src/lib/validation";

const checkedAt = "2026-07-10T00:00:00Z";
const officialUrl = "https://example.gov/program";

function citation(sourceId = "source-one", url = officialUrl) {
  return {
    source_id: sourceId,
    url,
    quote_md: "Official policy evidence.",
    section: "Requirements",
    retrieved_at: checkedAt,
  };
}

function validDataset() {
  const program = {
    id: "country-program",
    country_id: "country",
    category_ids: ["skilled_worker"],
    official_names: { en: "Country Program" },
    aliases: [],
    status: "active",
    summary_md: { en: "A permanent residence program." },
    good_for_md: { en: "Skilled workers seeking permanent residence." },
    pathway_mechanism: "points_invitation",
    eligibility: {
      age: { points_sensitive: true },
      education: {
        required_level: "secondary",
        credential_assessment_required: true,
      },
      work_experience: {
        min_years: 1,
        occupation_list_required: true,
      },
      language: [{ language: "en", minimum_level: "CLB 7" }],
      health_check_required: true,
      police_certificate_required: true,
      points_based: true,
      points_threshold: 67,
      invitation_competition_level: "high",
      job_offer_required: false,
      sponsor_required: false,
    },
    funds: {
      proof_of_funds: [
        {
          amount: 15263,
          currency: "CAD",
          applies_to: "primary",
          calculation: "minimum_total",
          family_size: 1,
        },
      ],
      application_fees: [
        {
          label: { en: "Application fee" },
          amount: "variable",
          currency: "CAD",
          applies_to: "primary",
        },
      ],
    },
    income: {
      required: false,
      accepted_sources: [],
      income_location: "not_applicable",
    },
    timeline: { renewable: false },
    rights: {
      work_allowed: true,
      local_employment_allowed: true,
      remote_work_allowed: true,
      study_allowed: true,
      business_allowed: true,
    },
    family: {
      spouse_or_partner_allowed: true,
      unmarried_partner_allowed: true,
      children_allowed: true,
      spouse_work_allowed: true,
      dependent_parents_allowed: false,
    },
    pr_pathway: { available: true },
    citizenship_pathway: { available: "indirect", min_residence_years: 3 },
    risk: {
      policy_stability_score: 4,
      source_confidence_score: 5,
      extraction_confidence_score: 5,
      needs_human_review: false,
    },
    comparison: {
      source_confidence_score: 5,
      policy_stability_score: 4,
    },
    filter: {
      pathway_type: "direct_pr",
      settlement_track: "direct_pr",
      pathway_mechanism: "points_invitation",
      min_liquid_funds_usd: "variable",
      accepts_remote_income: "not_applicable",
      accepts_self_employment: true,
      accepts_overseas_remote_income: "not_applicable",
      requires_degree: true,
      requires_job_offer: false,
      requires_investment: false,
      requires_language_test: true,
      requires_local_entity: false,
      allows_family: true,
      work_allowed: true,
      remote_work_allowed: true,
      leads_to_pr: true,
      leads_to_citizenship: "indirect",
      policy_stability_score: 4,
      source_confidence_score: 5,
      last_checked_at: checkedAt,
    },
    source_ids: ["source-one"],
    field_citations: {
      "/status": [citation()],
      "/pathway_mechanism": [citation()],
      "/summary_md": [citation()],
      "/good_for_md": [citation()],
      "/eligibility": [citation()],
      "/funds": [citation()],
      "/income": [citation()],
      "/timeline": [citation()],
      "/rights": [citation()],
      "/family": [citation()],
      "/pr_pathway": [citation()],
      "/citizenship_pathway": [citation()],
      "/filter": [citation()],
    },
    freshness: {
      created_at: checkedAt,
      updated_at: checkedAt,
      last_checked_at: checkedAt,
      update_frequency_days: 3,
      confidence: "high",
      needs_human_review: false,
    },
    changelog: [],
  };

  return {
    categories: [
      {
        id: "skilled_worker",
        names: { en: "Skilled worker" },
        description_md: { en: "Work-based immigration." },
      },
    ],
    countries: [
      {
        id: "country",
        iso2: "CT",
        iso3: "CTR",
        names: { en: "Country" },
        region: "Region",
        summary_md: { en: "Country summary." },
        brand: { color: "#336699", source: "hybrid" },
        official_source_ids: ["source-one"],
        categories: ["skilled_worker"],
        program_ids: ["country-program"],
        freshness: {
          created_at: checkedAt,
          updated_at: checkedAt,
          last_checked_at: checkedAt,
          update_frequency_days: 7,
          confidence: "high",
          needs_human_review: false,
        },
      },
    ],
    programs: [program],
    sources: [
      {
        id: "source-one",
        country_id: "country",
        program_ids: ["country-program"],
        url: officialUrl,
        title: "Official program page",
        publisher: "Example Government",
        source_type: "official",
        language: "en",
        priority: 1,
        update_frequency_days: 3,
        extraction_method: "web_extract",
        last_checked_at: checkedAt,
        last_success_at: checkedAt,
        status: "active",
      },
    ],
  };
}

test("entity loader reads JSON files in stable ID order", async () => {
  const directory = await mkdtemp(join(tmpdir(), "world-immigrant-data-"));
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "z.json"), '{"id":"z","value":2}\n');
    await writeFile(join(directory, "a.json"), '{"id":"a","value":1}\n');
    const schema = z.object({ id: z.string(), value: z.number() });

    const entities = await loadEntityDirectory(directory, schema);

    assert.deepEqual(
      entities.map(({ id }) => id),
      ["a", "z"],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("integrity validation accepts ancestor citations for material nested fields", () => {
  const result = validateDataset(validDataset(), {
    now: new Date("2026-07-11T00:00:00Z"),
  });

  assert.deepEqual(result.errors, []);
});

test("integrity validation rejects a missing cross reference", () => {
  const dataset = validDataset();
  dataset.programs[0].country_id = "missing-country";

  const result = validateDataset(dataset, { now: new Date("2026-07-11T00:00:00Z") });

  assert.ok(result.errors.some((message) => message.includes("missing-country")));
});

test("integrity validation rejects uncited material fields", () => {
  const dataset = validDataset();
  delete dataset.programs[0].field_citations["/eligibility"];

  const result = validateDataset(dataset, { now: new Date("2026-07-11T00:00:00Z") });

  assert.ok(result.errors.some((message) => message.includes("/eligibility")));
});

test("integrity validation rejects citation URLs that do not match the source registry", () => {
  const dataset = validDataset();
  dataset.programs[0].field_citations["/status"] = [
    citation("source-one", "https://unrelated.example/policy"),
  ];

  const result = validateDataset(dataset, { now: new Date("2026-07-11T00:00:00Z") });

  assert.ok(result.errors.some((message) => message.includes("does not match source")));
});

test("integrity validation rejects unknown schema keys", () => {
  const dataset = validDataset();
  (dataset.programs[0] as Record<string, unknown>).eligiblity = {};
  const result = validateDataset(dataset, { now: new Date("2026-07-10T00:00:00Z") });
  assert.ok(result.errors.some((message: string) => message.includes("Unrecognized key")));
});

test("freshness is a warning normally and an error in strict mode", () => {
  const dataset = validDataset();
  const now = new Date("2026-08-10T00:00:00Z");

  const normal = evaluateFreshness(dataset, { now, strict: false });
  const strict = evaluateFreshness(dataset, { now, strict: true });

  assert.equal(normal.errors.length, 0);
  assert.ok(normal.warnings.length > 0);
  assert.ok(strict.errors.length > 0);
});
