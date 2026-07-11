import { z } from "zod";

export const localizedTextSchema = z
  .strictObject({ en: z.string().min(1) })
  .catchall(z.string().min(1));

export const localizedMarkdownSchema = localizedTextSchema;

const booleanOrUnknownSchema = z.union([
  z.boolean(),
  z.literal("unknown"),
  z.literal("not_applicable"),
]);
const limitedBooleanSchema = z.union([
  z.boolean(),
  z.literal("limited"),
  z.literal("unknown"),
  z.literal("not_applicable"),
]);
const numericUnknownSchema = z.union([
  z.number().nonnegative(),
  z.literal("variable"),
  z.literal("unknown"),
]);
const scoreSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const citationRefSchema = z.strictObject({
  source_id: z.string().min(1),
  url: z.string().url(),
  quote_md: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  snapshot_id: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  quote_hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  retrieved_at: z.string().datetime(),
});

export const freshnessSchema = z.strictObject({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_checked_at: z.string().datetime(),
  last_changed_at: z.string().datetime().optional(),
  update_frequency_days: z.number().int().positive(),
  confidence: z.enum(["high", "medium", "low"]),
  needs_human_review: z.boolean(),
});

export const categorySchema = z.strictObject({
  id: z.string().min(1),
  names: localizedTextSchema,
  description_md: localizedMarkdownSchema,
});

export const sourceSchema = z.strictObject({
  id: z.string().min(1),
  country_id: z.string().min(1),
  program_ids: z.array(z.string()),
  url: z.string().url(),
  title: z.string().min(1),
  publisher: z.string().min(1),
  source_type: z.enum([
    "official",
    "law",
    "government_pdf",
    "embassy",
    "official_calculator",
    "reputable_secondary",
  ]),
  language: z.string().min(2),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  update_frequency_days: z.number().int().positive(),
  extraction_method: z.enum(["web_extract", "browser", "pdf", "manual"]),
  expected_content_hints: z.array(z.string().min(1)).optional(),
  expected_domains: z.array(z.string().min(1)).optional(),
  last_checked_at: z.string().datetime().optional(),
  last_success_at: z.string().datetime().optional(),
  status: z.enum(["active", "broken", "needs_attention", "deprecated"]),
});

/** sRGB hex used as a decorative country accent in UI (chip, bar, swatch). */
export const brandColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "brand.color must be a 6-digit hex color like #C8102E");

export const countryBrandSchema = z.strictObject({
  color: brandColorSchema,
  /**
   * Where the color comes from:
   * - flag: national flag or closely related national mark
   * - official_site: primary brand color of the immigration / government site
   * - hybrid: deliberate blend when flag and official site differ
   */
  source: z.enum(["flag", "official_site", "hybrid"]),
});

export const countrySchema = z.strictObject({
  id: z.string().min(1),
  iso2: z.string().length(2),
  iso3: z.string().length(3),
  names: localizedTextSchema,
  region: z.string().min(1),
  summary_md: localizedMarkdownSchema,
  brand: countryBrandSchema,
  official_source_ids: z.array(z.string()),
  categories: z.array(z.string()),
  program_ids: z.array(z.string()),
  freshness: freshnessSchema,
});

const moneyRequirementSchema = z.strictObject({
  amount: numericUnknownSchema,
  currency: z.string().min(3).max(3),
  period: z.enum(["one_time", "monthly", "annual"]).optional(),
  applies_to: z.enum(["primary", "family", "per_dependent", "business", "unknown"]),
  calculation: z
    .enum(["minimum_total", "increment_per_additional_member"])
    .default("minimum_total"),
  family_size: z.number().int().positive().optional(),
  family_size_above: z.number().int().positive().optional(),
  note_md: localizedMarkdownSchema.optional(),
});

const feeSchema = z.strictObject({
  label: localizedTextSchema,
  amount: numericUnknownSchema,
  currency: z.string().min(3).max(3),
  applies_to: z.enum(["primary", "family", "per_dependent", "business", "unknown"]),
});

const languageRequirementSchema = z.strictObject({
  language: z.string().min(2),
  test: z.string().min(1).optional(),
  minimum_level: z.string().min(1).optional(),
  minimum_benchmark: z.number().int().nonnegative().optional(),
  note_md: localizedMarkdownSchema.optional(),
});

const eligibilitySchema = z.strictObject({
  age: z.strictObject({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    points_sensitive: z.boolean().optional(),
    note_md: localizedMarkdownSchema.optional(),
  }),
  education: z.strictObject({
    required_level: z
      .enum([
        "none",
        "secondary",
        "vocational",
        "associate",
        "bachelor",
        "master",
        "doctorate",
        "professional_license",
        "unknown",
      ])
      .optional(),
    credential_assessment_required: booleanOrUnknownSchema.optional(),
    credential_assessment_condition: z.literal("foreign_education").optional(),
    note_md: localizedMarkdownSchema.optional(),
  }),
  work_experience: z.strictObject({
    min_years: z.number().nonnegative().optional(),
    occupation_list_required: booleanOrUnknownSchema.optional(),
    occupation_source_ids: z.array(z.string()).optional(),
    note_md: localizedMarkdownSchema.optional(),
  }),
  language: z.array(languageRequirementSchema),
  health_check_required: booleanOrUnknownSchema,
  police_certificate_required: booleanOrUnknownSchema,
  points_based: booleanOrUnknownSchema,
  points_threshold: numericUnknownSchema.optional(),
  invitation_competition_level: z
    .enum(["low", "medium", "high", "very_high", "unknown"])
    .optional(),
});

const fundsSchema = z.strictObject({
  proof_of_funds: z.array(moneyRequirementSchema),
  proof_of_funds_exemptions: z
    .array(
      z.strictObject({
        all_of: z.array(z.enum(["authorized_to_work_in_country", "valid_job_offer"])).min(1),
        note_md: localizedMarkdownSchema.optional(),
      }),
    )
    .optional(),
  exemption_note_md: localizedMarkdownSchema.optional(),
  minimum_investment: z.array(moneyRequirementSchema).optional(),
  net_worth_requirement: z.array(moneyRequirementSchema).optional(),
  application_fees: z.array(feeSchema),
  renewal_fees: z.array(feeSchema).optional(),
});

const incomeSchema = z.strictObject({
  required: booleanOrUnknownSchema,
  min_income: z.array(moneyRequirementSchema).optional(),
  accepted_sources: z.array(
    z.enum([
      "employment",
      "remote_employment",
      "self_employment",
      "business_income",
      "dividends",
      "passive_income",
      "savings",
      "pension",
      "unknown",
    ]),
  ),
  stability_requirement_md: localizedMarkdownSchema.optional(),
});

const timelineSchema = z.strictObject({
  application_processing_time_md: localizedMarkdownSchema.optional(),
  processing_time_months_min: numericUnknownSchema.optional(),
  processing_time_months_max: numericUnknownSchema.optional(),
  initial_validity_months: numericUnknownSchema.optional(),
  renewable: booleanOrUnknownSchema,
  max_stay_months: numericUnknownSchema.optional(),
});

const rightsSchema = z.strictObject({
  work_allowed: limitedBooleanSchema,
  local_employment_allowed: limitedBooleanSchema,
  remote_work_allowed: limitedBooleanSchema,
  study_allowed: limitedBooleanSchema,
  business_allowed: limitedBooleanSchema,
  healthcare_access_md: localizedMarkdownSchema.optional(),
  tax_residency_note_md: localizedMarkdownSchema.optional(),
});

const familySchema = z.strictObject({
  spouse_or_partner_allowed: limitedBooleanSchema,
  unmarried_partner_allowed: booleanOrUnknownSchema,
  children_allowed: limitedBooleanSchema,
  max_child_age: numericUnknownSchema.optional(),
  spouse_work_allowed: limitedBooleanSchema,
  dependent_parents_allowed: booleanOrUnknownSchema,
  note_md: localizedMarkdownSchema.optional(),
});

const pathwaySchema = z.strictObject({
  available: z.union([z.boolean(), z.literal("indirect"), z.literal("unknown")]),
  min_residence_years: numericUnknownSchema.optional(),
  physical_presence_requirement_md: localizedMarkdownSchema.optional(),
  language_requirement_md: localizedMarkdownSchema.optional(),
  summary_md: localizedMarkdownSchema.optional(),
});

const riskSchema = z.strictObject({
  policy_stability_score: scoreSchema,
  source_confidence_score: scoreSchema,
  extraction_confidence_score: scoreSchema,
  needs_human_review: z.boolean(),
  rationale_md: localizedMarkdownSchema.optional(),
});

const comparisonSchema = z.strictObject({
  difficulty_score: scoreSchema.optional(),
  cost_score: scoreSchema.optional(),
  speed_score: scoreSchema.optional(),
  permanence_score: scoreSchema.optional(),
  family_friendliness_score: scoreSchema.optional(),
  source_confidence_score: scoreSchema,
  policy_stability_score: scoreSchema,
});

export const programFilterSchema = z.strictObject({
  pathway_type: z.enum([
    "temporary_only",
    "renewable_temporary",
    "residence",
    "direct_pr",
    "direct_citizenship",
    "unknown",
  ]),
  min_age: z.number().int().nonnegative().optional(),
  max_age: z.number().int().positive().optional(),
  min_liquid_funds_usd: numericUnknownSchema.optional(),
  min_monthly_income_usd: numericUnknownSchema.optional(),
  min_annual_income_usd: numericUnknownSchema.optional(),
  min_net_worth_usd: numericUnknownSchema.optional(),
  min_investment_usd: numericUnknownSchema.optional(),
  accepts_remote_income: booleanOrUnknownSchema,
  accepts_self_employment: booleanOrUnknownSchema,
  requires_degree: booleanOrUnknownSchema,
  requires_job_offer: booleanOrUnknownSchema,
  requires_investment: booleanOrUnknownSchema,
  requires_language_test: booleanOrUnknownSchema,
  allows_family: booleanOrUnknownSchema,
  work_allowed: limitedBooleanSchema,
  remote_work_allowed: limitedBooleanSchema,
  leads_to_pr: z.union([z.boolean(), z.literal("indirect"), z.literal("unknown")]),
  leads_to_citizenship: z.union([z.boolean(), z.literal("indirect"), z.literal("unknown")]),
  processing_time_months_min: numericUnknownSchema.optional(),
  processing_time_months_max: numericUnknownSchema.optional(),
  policy_stability_score: scoreSchema,
  source_confidence_score: scoreSchema,
  last_checked_at: z.string().datetime(),
});

const changeLogEntrySchema = z.strictObject({
  changed_at: z.string().datetime(),
  summary: z.string().min(1),
  source_ids: z.array(z.string()).min(1),
});

export const programSchema = z.strictObject({
  id: z.string().min(1),
  country_id: z.string().min(1),
  category_ids: z.array(z.string()).min(1),
  official_names: localizedTextSchema,
  aliases: z.array(z.string()),
  status: z.enum(["active", "paused", "closed", "unknown"]),
  status_note_md: localizedMarkdownSchema.optional(),
  summary_md: localizedMarkdownSchema,
  good_for_md: localizedMarkdownSchema,
  not_good_for_md: localizedMarkdownSchema.optional(),
  eligibility: eligibilitySchema,
  funds: fundsSchema,
  income: incomeSchema,
  timeline: timelineSchema,
  rights: rightsSchema,
  family: familySchema,
  pr_pathway: pathwaySchema,
  citizenship_pathway: pathwaySchema,
  risk: riskSchema,
  comparison: comparisonSchema,
  filter: programFilterSchema,
  source_ids: z.array(z.string()).min(1),
  field_citations: z.record(z.string().startsWith("/"), z.array(citationRefSchema).min(1)),
  freshness: freshnessSchema,
  changelog: z.array(changeLogEntrySchema),
});

export type Category = z.infer<typeof categorySchema>;
export type CitationRef = z.infer<typeof citationRefSchema>;
export type Country = z.infer<typeof countrySchema>;
export type CountryBrand = z.infer<typeof countryBrandSchema>;
export type Program = z.infer<typeof programSchema>;
export type ProgramFilter = z.infer<typeof programFilterSchema>;
export type Source = z.infer<typeof sourceSchema>;
