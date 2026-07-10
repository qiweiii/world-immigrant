# World Immigrant — Data Model Plan

## 1. Data Principles

See `docs/implementation/ux-filter-fields.md` for the deeper profile/filter field design and `docs/research/source-and-field-examples.md` for competitor-derived field examples.

1. Data should be structured enough for comparison/filtering.
2. Text fields can use Markdown for nuance, examples, and links.
3. Every material claim must be traceable through `field_citations`, keyed by JSON Pointer.
4. Keep numeric/enum values separate from prose.
5. Track freshness per object and per source.
6. Never overwrite changed facts without a changelog entry; source hashes and local snapshots support review.
7. Omission means a field is structurally inapplicable. If a fact applies but cannot be established, store explicit `unknown`.

## 2. Top-level Entities

```text
Country
 └── ImmigrationCategory
    └── VisaProgram
       ├── EligibilityCriteria
       ├── CostAndFunds
       ├── Timeline
       ├── RightsAndRestrictions
       ├── FamilyPolicy
       ├── PRPathway
       ├── CitizenshipPathway
       ├── RiskAndStability
       └── SourceEvidence
```

## 3. Country Object

```ts
type Country = {
 id: string;         // "canada"
 iso2: string;        // "CA"
 iso3: string;        // "CAN"
 names: LocalizedText;    // { en: "Canada", "zh-Hans": "Canada (zh translation sample)" }
 region: string;       // "North America"
 summary_md: LocalizedMarkdown;
 official_source_ids: string[]; // references the canonical source registry
 categories: string[];    // category IDs available in this country
 program_ids: string[];
 freshness: Freshness;
};
```

## 4. Category Object

```ts
type ImmigrationCategory = {
 id:
  | "skilled_worker"
  | "study_to_pr"
  | "digital_nomad"
  | "investor"
  | "startup_entrepreneur"
  | "family"
  | "retirement"
  | "e_residency"
  | "humanitarian"
  | "other";
 names: LocalizedText;
 description_md: LocalizedMarkdown;
};
```

## 5. Visa Program Object

```ts
type VisaProgram = {
 id: string;            // "canada-express-entry-fsw"
 country_id: string;        // "canada"
 category_ids: string[];      // ["skilled_worker"]
 official_names: LocalizedText;
 aliases: string[];
 status: "active" | "paused" | "closed" | "unknown";
 status_note_md?: LocalizedMarkdown;

 summary_md: LocalizedMarkdown;
 good_for_md: LocalizedMarkdown;
 not_good_for_md?: LocalizedMarkdown;

 eligibility: EligibilityCriteria;
 funds: CostAndFunds;
 income: IncomeRequirements;
 timeline: Timeline;
 fees: Fee[];
 rights: RightsAndRestrictions;
 family: FamilyPolicy;
 pr_pathway: Pathway;
 citizenship_pathway: Pathway;
 risk: RiskAndStability;

 comparison: ComparisonFields;
 filter: FilterFields;

 source_ids: string[];
 field_citations: Record<string, CitationRef[]>;
 freshness: Freshness;
 changelog: ChangeLogEntry[];
};
```

## 6. Normalized Criteria Fields

These fields power compare/filter. If information is unknown, use explicit `unknown`, not null-by-accident.

```ts
type EligibilityCriteria = {
 age: {
  min?: number;
  max?: number;
  points_sensitive?: boolean;
  note_md?: LocalizedMarkdown;
 };
 education: {
  required_level?: EducationLevel;
  credential_assessment_required?: boolean;
  note_md?: LocalizedMarkdown;
 };
 work_experience: {
  min_years?: number;
  occupation_list_required?: boolean;
  occupation_list_refs?: SourceRef[];
  note_md?: LocalizedMarkdown;
 };
 language: LanguageRequirement[];
 health_check_required?: boolean | "unknown";
 police_certificate_required?: boolean | "unknown";
 points_based?: boolean;
 points_threshold?: number | "variable" | "unknown";
 invitation_competition_level?: "low" | "medium" | "high" | "very_high" | "unknown";
};
```

## 7. Money Fields

```ts
type CostAndFunds = {
 proof_of_funds: MoneyRequirement[];
 minimum_investment?: MoneyRequirement[];
 net_worth_requirement?: MoneyRequirement[];
 application_fees: Fee[];
 renewal_fees?: Fee[];
};

type MoneyRequirement = {
 amount: number | "variable" | "unknown";
 currency: string;
 period?: "one_time" | "monthly" | "annual";
 applies_to: "primary" | "family" | "per_dependent" | "business" | "unknown";
 note_md?: LocalizedMarkdown;
};
```

## 8. Income Fields

```ts
type IncomeRequirements = {
 required: boolean | "unknown";
 min_income?: MoneyRequirement[];
 accepted_sources: Array<
  | "employment"
  | "remote_employment"
  | "self_employment"
  | "business_income"
  | "dividends"
  | "passive_income"
  | "savings"
  | "pension"
  | "unknown"
 >;
 stability_requirement_md?: LocalizedMarkdown;
};
```

## 9. Timeline / Rights / Family

```ts
type Timeline = {
 application_processing_time_md?: LocalizedMarkdown;
 initial_validity_months?: number | "variable" | "unknown";
 renewable?: boolean | "unknown";
 max_stay_months?: number | "variable" | "unknown";
};

type RightsAndRestrictions = {
 work_allowed: boolean | "limited" | "unknown";
 local_employment_allowed: boolean | "limited" | "unknown";
 remote_work_allowed: boolean | "limited" | "unknown";
 study_allowed: boolean | "limited" | "unknown";
 healthcare_access_md?: LocalizedMarkdown;
 tax_residency_note_md?: LocalizedMarkdown;
};

type FamilyPolicy = {
 spouse_allowed: boolean | "unknown";
 children_allowed: boolean | "unknown";
 spouse_work_allowed: boolean | "limited" | "unknown";
 note_md?: LocalizedMarkdown;
};
```

## 10. Pathways

```ts
type Pathway = {
 available: boolean | "indirect" | "unknown";
 min_residence_years?: number | "variable" | "unknown";
 physical_presence_requirement_md?: LocalizedMarkdown;
 language_requirement_md?: LocalizedMarkdown;
 summary_md?: LocalizedMarkdown;
};
```

## 11. Comparison Fields

These are normalized rollups for table display.

```ts
type ComparisonFields = {
 difficulty_score?: 1 | 2 | 3 | 4 | 5;
 cost_score?: 1 | 2 | 3 | 4 | 5;
 speed_score?: 1 | 2 | 3 | 4 | 5;
 permanence_score?: 1 | 2 | 3 | 4 | 5;
 family_friendliness_score?: 1 | 2 | 3 | 4 | 5;
 source_confidence_score?: 1 | 2 | 3 | 4 | 5;
 policy_stability_score?: 1 | 2 | 3 | 4 | 5;
};
```

Score definitions must be documented and conservative. Scores are product interpretations, not official facts, so they need citations/rationale.

## 12. Filter Fields

```ts
type FilterFields = {
 min_age?: number;
 max_age?: number;
 max_age_soft?: boolean;
 min_liquid_funds_usd?: number;
 min_monthly_income_usd?: number;
 accepts_remote_income?: boolean;
 accepts_self_employment?: boolean;
 requires_degree?: boolean;
 requires_job_offer?: boolean;
 requires_investment?: boolean;
 allows_family?: boolean;
 leads_to_pr?: boolean | "indirect" | "unknown";
 leads_to_citizenship?: boolean | "indirect" | "unknown";
 requires_language_test?: boolean;
 notes_md?: LocalizedMarkdown;
};
```

Filter engine should return reasons, not only matches:

```ts
type FilterResult = {
 visa_program_id: string;
 status: "likely_match" | "possible_match" | "not_match" | "needs_review" | "unknown";
 score: number;
 reasons: Array<{
  field: string;
  severity: "positive" | "warning" | "blocking" | "unknown";
  message_md: LocalizedMarkdown;
  citations: CitationRef[];
 }>;
};
```

## 13. Source/Citation Model

```ts
type SourceRef = {
 id: string;         // stable source id
 title: string;
 url: string;
 publisher: string;     // e.g. official immigration department
 source_type: "official" | "law" | "government_pdf" | "embassy" | "reputable_secondary";
 language: string;
 retrieved_at: string;    // ISO datetime
 content_hash?: string;
 status: "active" | "broken" | "needs_attention" | "deprecated";
};

type CitationRef = {
 source_id: string;
 url: string;
 quote_md?: string;
 section?: string;
 retrieved_at: string;
};
```

`field_citations` uses RFC 6901 JSON Pointer paths such as `/eligibility/language/0/minimum_level`. Each key points to one or more `CitationRef` values. A material field has exactly one provenance path; nested value objects do not carry duplicate citation arrays.

## 14. Freshness Model

```ts
type Freshness = {
 created_at: string;
 updated_at: string;
 last_checked_at: string;
 last_changed_at?: string;
 update_frequency_days: number;
 confidence: "high" | "medium" | "low";
 needs_human_review: boolean;
};
```

## 15. Citation Example

```json
{
  "source_ids": ["example-gov-visa"],
  "field_citations": {
    "/income/min_income/0/amount": [
      {
        "source_id": "example-gov-visa",
        "url": "https://example.gov/visa",
        "section": "Income requirement",
        "quote_md": "Applicants must show monthly income of EUR 3,000.",
        "retrieved_at": "2026-07-08T00:00:00Z"
      }
    ]
  }
}
```

The source itself is stored once in `src/data/sources/example-gov-visa.json`. Program data references it by stable ID, and every cited URL must match that registry entry or an approved canonical subpage.

## 16. Validation Rules

Integrity validation fails if:

- Any active visa lacks sources.
- Any material Markdown field lacks at least one field citation.
- Any numeric threshold has no field citation.
- Localized text exists without canonical English/canonical fact source.
- Filter-critical fields are silently omitted; use `unknown` where unknown.

The normal validation command reports overdue countries, programs, and sources as warnings. `pnpm data:freshness` enforces the same findings as errors for updater and release audits. This separation keeps stale data visible without preventing unrelated corrective changes from building.
