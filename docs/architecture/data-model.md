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
type CountryBrand = {
 /** sRGB hex accent used in UI chips, bars, and swatches, e.g. "#D52B1E" */
 color: string;
 /**
  * Provenance of the color choice:
  * - flag: national flag or closely related national mark
  * - official_site: primary brand color of the immigration / government site
  * - hybrid: deliberate blend when flag and official site differ
  */
 source: "flag" | "official_site" | "hybrid";
};

type Country = {
 id: string;         // "canada"
 iso2: string;        // "CA"
 iso3: string;        // "CAN"
 names: LocalizedText;    // { en: "Canada", "zh-Hans": "Canada (zh translation sample)" }
 region: string;       // "North America"
 summary_md: LocalizedMarkdown;
 brand: CountryBrand;    // decorative UI accent; not a legal/policy field
 official_source_ids: string[]; // references the canonical source registry
 categories: string[];    // category IDs available in this country
 program_ids: string[];
 freshness: Freshness;
};
```

### Country brand color rules

- Required on every country record. Prefer a single stable hex that remains recognizable at small sizes (swatches, card bars).
- Prefer the national flag or the immigration department’s primary brand color. Use `hybrid` only when neither alone is usable in UI.
- Brand color is **decorative presentation only**. Do not put small body text on a solid brand fill without a separate contrast check.
- Do not treat brand color as policy data; it does not need `field_citations`.

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
type PathwayMechanism =
 | "employer_sponsored"
 | "self_sponsored"
 | "own_company"
 | "points_invitation"
 | "investment"
 | "remote_income"
 | "talent_pass"
 | "e_residency"
 | "other"
 | "unknown";

type SettlementTrack =
 | "temporary_no_pr"
 | "temporary_may_lead_pr"
 | "residence"
 | "direct_pr"
 | "e_status_only"
 | "unknown";

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

 /** How the person primarily enters the pathway (orthogonal to category). */
 pathway_mechanism: PathwayMechanism;

 eligibility: EligibilityCriteria;
 funds: CostAndFunds;
 income: IncomeRequirements;
 /** Present only for free-zone / company / EntrePass-style compound pathways. */
 business_setup?: BusinessSetup;
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

### Pathway mechanism vs category

- **Category** answers “what kind of immigration story?” (skilled, digital nomad, investor).
- **pathway_mechanism** answers “what unlocks entry?” (job offer, points pool, remote income, own company, e-residency).
- `filter.pathway_mechanism` must equal top-level `pathway_mechanism`.
- `filter.settlement_track` is the preferred temporary/PR signal for new fixtures; keep `pathway_type` aligned for compatibility.

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
 job_offer_required?: boolean | "unknown" | "not_applicable";
 sponsor_required?: boolean | "unknown" | "not_applicable";
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
 required: boolean | "unknown" | "not_applicable";
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
  | "saas_or_product"
  | "freelance"
  | "unknown"
 >;
 /** Where qualifying income must be earned (critical for remote-work routes). */
 income_location?:
  | "inside_destination"
  | "outside_destination"
  | "either"
  | "unknown"
  | "not_applicable";
 proof_history_months?: number | "variable" | "unknown";
 stability_requirement_md?: LocalizedMarkdown;
};
```

## 8b. Business setup (optional)

Omit when the pathway does not require forming a local entity.

```ts
type BusinessSetup = {
 required: boolean | "unknown" | "not_applicable";
 entity_types?: string[]; // free_zone, private_limited, ...
 min_setup_cost?: MoneyRequirement[];
 min_share_capital?: MoneyRequirement[];
 local_director_required?: boolean | "unknown" | "not_applicable";
 renewal_milestones?: Array<{
  after_years: number;
  min_local_employees?: number | "variable" | "unknown";
  min_business_spend?: MoneyRequirement;
  note_md?: LocalizedMarkdown;
 }>;
 note_md?: LocalizedMarkdown;
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
 pathway_type:
  | "temporary_only"
  | "renewable_temporary"
  | "residence"
  | "direct_pr"
  | "direct_citizenship"
  | "unknown";
 /** Preferred temporary/PR signal for new programs. */
 settlement_track: SettlementTrack;
 /** Must equal program.pathway_mechanism. */
 pathway_mechanism: PathwayMechanism;
 min_age?: number;
 max_age?: number;
 max_age_soft?: boolean;
 min_liquid_funds_usd?: number | "variable" | "unknown";
 min_monthly_income_usd?: number | "variable" | "unknown";
 min_annual_income_usd?: number | "variable" | "unknown";
 min_net_worth_usd?: number | "variable" | "unknown";
 min_investment_usd?: number | "variable" | "unknown";
 accepts_remote_income?: boolean | "unknown" | "not_applicable";
 accepts_self_employment?: boolean | "unknown" | "not_applicable";
 accepts_overseas_remote_income?: boolean | "unknown" | "not_applicable";
 requires_degree?: boolean | "unknown" | "not_applicable";
 requires_job_offer?: boolean | "unknown" | "not_applicable";
 requires_investment?: boolean | "unknown" | "not_applicable";
 requires_language_test?: boolean | "unknown" | "not_applicable";
 requires_local_entity?: boolean | "unknown" | "not_applicable";
 allows_family?: boolean | "unknown" | "not_applicable";
 work_allowed?: boolean | "limited" | "unknown" | "not_applicable";
 remote_work_allowed?: boolean | "limited" | "unknown" | "not_applicable";
 leads_to_pr?: boolean | "indirect" | "unknown";
 leads_to_citizenship?: boolean | "indirect" | "unknown";
 processing_time_months_min?: number | "variable" | "unknown";
 processing_time_months_max?: number | "variable" | "unknown";
 policy_stability_score: 1 | 2 | 3 | 4 | 5;
 source_confidence_score: 1 | 2 | 3 | 4 | 5;
 last_checked_at: string;
};
```

Filter engine should return reasons, not only matches:

```ts
type FilterResult = {
 program_id: string;
 status: "likely_match" | "possible_match" | "not_match" | "needs_review" | "unknown";
 score: number;
 reasons: Array<{
  field: string;
  severity: "positive" | "warning" | "blocking" | "unknown";
  message: string;
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
