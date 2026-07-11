import type { CanonicalDataset } from "./data";

export function canonicalGenerationTime(dataset: CanonicalDataset) {
  const timestamps = [
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
  ];
  if (!timestamps.length) return new Date(0);
  return new Date(Math.max(...timestamps.map((value) => new Date(value).getTime())));
}

export function buildPublicData(dataset: CanonicalDataset, generatedAt = new Date()) {
  const { categories, countries, programs, sources } = dataset;
  const countryById = new Map(countries.map((country) => [country.id, country]));

  const filterIndex = {
    schema_version: 1,
    programs: programs.map((program) => ({
      program_id: program.id,
      country_id: program.country_id,
      country_names: countryById.get(program.country_id)?.names ?? { en: program.country_id },
      country_brand_color: countryById.get(program.country_id)?.brand.color,
      category_ids: program.category_ids,
      official_names: program.official_names,
      status: program.status,
      criteria: {
        min_work_experience_years: program.eligibility.work_experience.min_years,
        min_language_benchmark: program.eligibility.language[0]?.minimum_benchmark,
        min_education_level: program.eligibility.education.required_level,
        credential_assessment_required:
          program.eligibility.education.credential_assessment_required,
        credential_assessment_condition:
          program.eligibility.education.credential_assessment_condition,
        min_program_selection_points: program.eligibility.points_threshold,
        job_offer_required: program.eligibility.job_offer_required,
        sponsor_required: program.eligibility.sponsor_required,
        proof_of_funds: program.funds.proof_of_funds,
        proof_of_funds_exemptions: program.funds.proof_of_funds_exemptions ?? [],
        income_required: program.income.required,
        min_income: program.income.min_income ?? [],
        accepted_income_sources: program.income.accepted_sources,
        income_location: program.income.income_location,
        proof_history_months: program.income.proof_history_months,
        requires_local_entity: program.business_setup?.required,
      },
      freshness: program.freshness,
      field_citations: program.field_citations,
      ...program.filter,
    })),
  };

  const compareIndex = {
    schema_version: 1,
    programs: programs.map((program) => ({
      program_id: program.id,
      country_id: program.country_id,
      country_names: countryById.get(program.country_id)?.names ?? { en: program.country_id },
      category_ids: program.category_ids,
      official_names: program.official_names,
      status: program.status,
      pathway_mechanism: program.pathway_mechanism,
      summary_md: program.summary_md,
      funds: program.funds,
      income: program.income,
      business_setup: program.business_setup,
      timeline: program.timeline,
      rights: program.rights,
      family: program.family,
      pr_pathway: program.pr_pathway,
      citizenship_pathway: program.citizenship_pathway,
      comparison: program.comparison,
      filter: {
        settlement_track: program.filter.settlement_track,
        pathway_mechanism: program.filter.pathway_mechanism,
        pathway_type: program.filter.pathway_type,
        requires_job_offer: program.filter.requires_job_offer,
        requires_local_entity: program.filter.requires_local_entity,
      },
      source_ids: program.source_ids,
      field_citations: program.field_citations,
      freshness: program.freshness,
    })),
  };

  return {
    index: {
      schema_version: 1,
      generated_at: generatedAt.toISOString(),
      counts: {
        categories: categories.length,
        countries: countries.length,
        programs: programs.length,
        sources: sources.length,
      },
      endpoints: {
        categories: "/data/categories.json",
        countries: "/data/countries.json",
        programs: "/data/programs.json",
        sources: "/data/sources.json",
        filter_index: "/data/indexes/filter-index.v1.json",
        compare_index: "/data/indexes/compare-index.v1.json",
      },
    },
    categories: { categories },
    countries: { countries },
    programs: { programs },
    sources: { sources },
    filterIndex,
    compareIndex,
  };
}

export type PublicData = ReturnType<typeof buildPublicData>;
