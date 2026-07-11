# World Immigrant — UX and Filter Field Design

## 1. UX goal

The best UX is not a giant country list. The best UX is a guided path from **my real situation** to **a credible, cited shortlist of possible destinations**.

Core user question:

> “Given who I am, my family, money, work, timeline, and risk tolerance, what lawful immigration paths should I explore — and why?”

The filter experience should produce reasons, not just results.

## 2. Core result states

Every program returned by the filter should be classified as one of:

| State | Meaning | UX treatment |
| --- | --- | --- |
| `likely_match` | No known blocking criteria based on profile and data. | Green/positive, but still says “preliminary”. |
| `possible_match` | Could work, but missing profile info or policy data. | Yellow; ask follow-up questions. |
| `not_match` | One or more known blocking criteria. | Grey/red; show exact blocking reasons. |
| `needs_review` | Too complex or high-stakes to classify safely. | Purple/neutral; recommend official/professional review. |
| `unknown` | Data missing/stale. | Low confidence; prioritize source update. |

## 3. User profile fields

Profile data should be local-first. The site stores it only in browser state / URL / exportable JSON, not a server account.

### 3.1 Identity and current situation

| Field | Type | Why it matters |
| --- | --- | --- |
| `citizenships` | country code[] | Determines visa-free entry, working holiday agreements, special treaties, consular route. |
| `residencies` | country code[] | Some programs depend on legal residence where applying. |
| `current_location_country` | country code | Consulate/application route; local constraints. |
| `birth_country` | country code optional | Some programs/security checks/lotteries may care. |
| `age` | number | Points systems, working holiday, youth mobility, retirement. |
| `marital_or_partner_status` | enum | Family inclusion, partner recognition. |
| `children_count` | number | Funds uplift, schooling/healthcare considerations. |
| `children_ages` | number[] | Dependent eligibility can depend on age. |
| `dependent_parents` | boolean | Rare but important for some investment/family routes. |

### 3.2 Education

| Field | Type | Why it matters |
| --- | --- | --- |
| `highest_education_level` | enum | Skilled, study, talent, points systems. |
| `field_of_study` | string / taxonomy | STEM/healthcare/shortage occupation relevance. |
| `degree_country` | country code | Credential recognition and assessment. |
| `credential_assessment_done` | boolean | Canada/Australia-style systems. |
| `willing_to_study` | boolean | Study-to-work-to-PR routes. |
| `study_budget_usd` | number range | Student route affordability. |

Education enum:

```ts
type EducationLevel =
 | "none"
 | "secondary"
 | "vocational"
 | "associate"
 | "bachelor"
 | "master"
 | "doctorate"
 | "professional_license"
 | "unknown";
```

### 3.3 Work and occupation

| Field | Type | Why it matters |
| --- | --- | --- |
| `occupation_title` | string | User-friendly input. |
| `occupation_codes` | taxonomy IDs | Match NOC/ISCO/ANZSCO/SOC shortage lists. |
| `years_experience_total` | number | Skilled route thresholds. |
| `years_experience_relevant` | number | Points and eligibility. |
| `current_employment_type` | enum | Employee, freelancer, founder, unemployed, student, retired. |
| `job_offer_country` | country code optional | Job-offer routes. |
| `job_offer_confirmed` | boolean | Hard gate for many work permits. |
| `licensed_profession` | boolean | Regulated occupations. |
| `portfolio_or_public_work` | boolean | Talent/founder/artist routes. |

Employment type enum:

```ts
type EmploymentType =
 | "employee"
 | "remote_employee"
 | "freelancer"
 | "contractor"
 | "founder"
 | "business_owner"
 | "investor"
 | "student"
 | "retired"
 | "unemployed"
 | "other";
```

### 3.4 Income, funds, and investment

| Field | Type | Why it matters |
| --- | --- | --- |
| `monthly_income_usd` | number | Digital nomad/passive income thresholds. |
| `annual_income_usd` | number | Some programs use annual income. |
| `income_sources` | enum[] | Remote salary vs freelance vs passive vs pension. |
| `income_stability_months` | number | Required proof history. |
| `liquid_savings_usd` | number | Proof of funds. |
| `net_worth_usd` | number | Investment/retirement routes. |
| `investment_budget_usd` | number | Golden visa/startup/investor routes. |
| `willing_to_buy_real_estate` | boolean | Investment route subtype. |
| `willing_to_start_business` | boolean | Startup/entrepreneur paths. |
| `willing_to_donate_or_nonrefundable_contribution` | boolean | Some CBI/RBI routes. |

Income source enum:

```ts
type IncomeSource =
 | "local_employment"
 | "remote_employment"
 | "freelance_clients"
 | "business_profit"
 | "dividends"
 | "rental_income"
 | "pension"
 | "savings"
 | "scholarship"
 | "family_support"
 | "unknown";
```

### 3.5 Language

| Field | Type | Why it matters |
| --- | --- | --- |
| `languages` | structured[] | Eligibility and integration. |
| `test_scores` | IELTS/CELPIP/TEF/etc. | Points systems. |
| `willing_to_learn_language` | boolean | Long-term PR/citizenship. |

Suggested shape:

```ts
type LanguageProfile = {
 language: "en" | "fr" | "de" | "es" | "pt" | "ja" | "ko" | string;
 self_level?: "none" | "basic" | "intermediate" | "advanced" | "native";
 cefr_level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
 test?: {
  name: "IELTS" | "CELPIP" | "PTE" | "TOEFL" | "TEF" | "TCF" | "Goethe" | string;
  scores: Record<string, number | string>;
  taken_at?: string;
 };
};
```

### 3.6 Goals and constraints

| Field | Type | Why it matters |
| --- | --- | --- |
| `target_regions` | region/country[] | User preference. |
| `avoid_regions` | region/country[] | Safety/political/personal constraints. |
| `timeline_goal` | enum | Fast stay vs PR vs citizenship. |
| `permanence_goal` | enum | Temporary, PR, citizenship, passport. |
| `min_stay_right_months` | number | Avoid tourist-only paths. |
| `max_physical_presence_days_per_year` | number | Residence obligations. |
| `risk_tolerance` | enum | Stable vs new/uncertain programs. |
| `budget_sensitivity` | enum | Low-cost routes. |
| `family_priority` | enum | Spouse/children fit. |
| `tax_sensitivity` | enum | Tax residence concerns. |
| `safety_priority` | enum | Conflict/security planning. |
| `climate_priority` | enum optional | Lifestyle fit. |
| `healthcare_priority` | enum optional | Family/medical needs. |

Timeline enum:

```ts
type TimelineGoal =
 | "legal_stay_fast"
 | "work_authorization_fast"
 | "residence_permit_fast"
 | "pr_fast"
 | "citizenship_fast"
 | "low_cost"
 | "family_security"
 | "high_certainty"
 | "explore_options";
```

Permanence enum:

```ts
type PermanenceGoal =
 | "temporary_stay"
 | "renewable_residence"
 | "permanent_residence"
 | "citizenship"
 | "second_passport"
 | "any";
```

## 4. Program filter fields

The program data needs a normalized layer specifically for filtering. These fields should be derived from the detailed data model and should be conservative.

```ts
type ProgramFilterIndex = {
 program_id: string;
 country_id: string;
 category_ids: string[];
 status: "active" | "paused" | "closed" | "unknown";

 // Access / applicant basics
 eligible_citizenships?: CountryRule;
 excluded_citizenships?: CountryRule;
 min_age?: number;
 max_age?: number;
 age_points_sensitive?: boolean;

 // Money
 min_liquid_funds_usd?: number | "variable" | "unknown";
 min_monthly_income_usd?: number | "variable" | "unknown";
 min_annual_income_usd?: number | "variable" | "unknown";
 min_net_worth_usd?: number | "variable" | "unknown";
 min_investment_usd?: number | "variable" | "unknown";
 family_funds_multiplier?: FamilyFundsRule;

 // Work / study
 accepted_income_sources: IncomeSource[] | "unknown";
 requires_job_offer: boolean | "unknown";
 requires_local_sponsor: boolean | "unknown";
 requires_degree: boolean | "unknown";
 min_education_level?: EducationLevel | "unknown";
 min_experience_years?: number | "unknown";
 occupation_list_required: boolean | "unknown";
 occupation_taxonomies?: string[];
 regulated_profession_barrier?: boolean | "unknown";

 // Language / character / health
 requires_language_test: boolean | "unknown";
 accepted_language_tests?: string[];
 min_language_levels?: LanguageRequirement[];
 health_check_required: boolean | "unknown";
 police_certificate_required: boolean | "unknown";

 // Rights
 work_allowed: boolean | "limited" | "unknown";
 local_employment_allowed: boolean | "limited" | "unknown";
 remote_work_allowed: boolean | "limited" | "unknown";
 study_allowed: boolean | "limited" | "unknown";
 business_allowed: boolean | "limited" | "unknown";

 // Family
 spouse_or_partner_allowed: boolean | "limited" | "unknown";
 unmarried_partner_allowed: boolean | "unknown";
 children_allowed: boolean | "limited" | "unknown";
 max_child_age?: number | "variable" | "unknown";
 spouse_work_allowed: boolean | "limited" | "unknown";
 dependent_parents_allowed: boolean | "unknown";

 // Permanence and entry mechanism
 // settlement_track is preferred for new fixtures; keep pathway_type aligned.
 settlement_track:
  | "temporary_no_pr"
  | "temporary_may_lead_pr"
  | "residence"
  | "direct_pr"
  | "e_status_only"
  | "unknown";
 pathway_type: "temporary_only" | "renewable_temporary" | "residence" | "direct_pr" | "direct_citizenship" | "unknown";
 pathway_mechanism:
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
 leads_to_pr: boolean | "indirect" | "unknown";
 min_years_to_pr?: number | "variable" | "unknown";
 leads_to_citizenship: boolean | "indirect" | "unknown";
 min_years_to_citizenship?: number | "variable" | "unknown";
 physical_presence_requirement_days_per_year?: number | "variable" | "unknown";

 // Entry / income gates (rollups; canonical detail lives on eligibility/income/business_setup)
 requires_job_offer?: boolean | "unknown" | "not_applicable";
 requires_local_entity?: boolean | "unknown" | "not_applicable";
 accepts_remote_income?: boolean | "unknown" | "not_applicable";
 accepts_overseas_remote_income?: boolean | "unknown" | "not_applicable";
 accepts_self_employment?: boolean | "unknown" | "not_applicable";
 min_monthly_income_usd?: number | "variable" | "unknown";
 min_annual_income_usd?: number | "variable" | "unknown";
 min_investment_usd?: number | "variable" | "unknown";

 // Process / reliability
 processing_time_months_min?: number | "unknown";
 processing_time_months_max?: number | "unknown";
 application_location: "online" | "consulate" | "in_country" | "mixed" | "unknown";
 quota_or_cap: boolean | "unknown";
 points_based: boolean | "unknown";
 competitive_invitation: boolean | "unknown";
 policy_stability_score?: 1 | 2 | 3 | 4 | 5;
 source_confidence_score: 1 | 2 | 3 | 4 | 5;
 last_checked_at: string; // internal freshness; UI label is "Updated"
};
```

### Notes on mechanism vs category

- Filter by **settlement track** when the user wants PR vs temporary stay vs e-status only.
- Filter by **pathway mechanism** when the user has (or lacks) a job offer, remote income, capital, or a company setup path.
- Category alone is not enough for UAE free-zone vs remote work vs golden visa within one country.

## 5. Compare table fields

The default compare table should not show every field. It should show the fields that change decisions.

### 5.1 Default columns

1. Country.
2. Program name.
3. Category.
4. Settlement track.
5. Entry mechanism.
6. Status.
7. Minimum funds / income / investment.
8. Job offer required?
9. Local entity required?
10. Degree/occupation requirement.
11. Language requirement.
12. Initial validity.
13. Processing time.
14. Work rights.
15. Family inclusion.
16. Path to PR.
17. Path to citizenship.
18. Physical presence requirement.
19. Source confidence.
20. Last updated.

### 5.2 Advanced columns

- Application fees.
- Renewal fees.
- Healthcare access.
- Tax-residency note.
- Spouse work rights.
- Child age limits.
- Local bank/account/NIF requirements.
- Criminal record requirement.
- Medical exam requirement.
- Quota/cap.
- Points threshold.
- Invitation competitiveness.
- Policy volatility.
- Document burden score.
- Translation/apostille burden.
- Whether applying from inside country is possible.
- Whether switching status is possible.

## 6. Field-level reason engine

The filter engine should generate human reasons from predicates.

Example:

```json
{
 "program_id": "portugal-d8-digital-nomad",
 "status": "possible_match",
 "score": 74,
 "reasons": [
  {
   "field": "income.min_monthly_income_usd",
   "severity": "positive",
   "message": "Your monthly remote income appears above the stated threshold.",
   "citations": [
    {
     "source_id": "portugal-official-d8",
     "url": "https://example.gov/portugal-d8",
     "section": "Income requirement"
    }
   ]
  },
  {
   "field": "family.spouse_work_allowed",
   "severity": "unknown",
   "message": "Spouse work rights need confirmation from official source.",
   "citations": []
  }
 ],
 "follow_up_questions": [
  "Do you have proof of accommodation for the required period?",
  "Is your income from an employer/client outside Portugal?"
 ]
}
```

## 7. UX flows

### Flow A — Explore first

1. User selects category: Digital Nomad / Skilled / Study / Startup / Investor.
2. Sees top-level comparison across countries.
3. Applies filters.
4. Saves shortlist.
5. Opens official sources.

### Flow B — Profile first

1. User answers 8–12 high-signal questions.
2. System shows preliminary matches.
3. User can add more detail to improve confidence.
4. System explains blockers and missing info.
5. User exports shortlist.

### Flow C — Country first

1. User opens a country.
2. Sees all paths grouped by category and permanence.
3. Compares country’s paths to alternatives.
4. Checks sources/freshness.

### Flow D — Plan B builder

1. User picks timeline: 3 months / 1 year / 3 years / 5 years.
2. User picks goals: safety, work, PR, citizenship, family.
3. System suggests multi-destination strategy buckets:
  - immediate legal stay;
  - medium-term residence;
  - long-term PR/citizenship;
  - fallback/backup option.

## 8. Progressive disclosure

Do not ask all fields upfront. Start with:

1. Citizenship(s).
2. Age.
3. Family moving with you?
4. Monthly income and source.
5. Savings / investment range.
6. Degree level.
7. Occupation / experience.
8. Language level.
9. Goal: temporary / PR / citizenship.
10. Timeline.

Then ask follow-ups only when needed by promising programs.

## 9. URL/state model

The site encodes non-sensitive filter state in query params for shareable URLs:

```text
/filter?category=digital_nomad&income=4000&currency=USD&family=spouse,child&goal=pr
```

For sensitive/full profiles:

- Keep in browser memory/local storage.
- Allow export/import JSON.
- Do not send to backend.

## 10. Accessibility and trust UX

Trust UI should be visible:

- Show official-source badge next to key facts.
- Show “last checked” on cards.
- Mark stale data.
- Use unknown states instead of blank cells.
- Allow “show source quote” expansion.
- Use simple language plus technical detail.
- Provide multilingual summaries but preserve official names.

## 11. Scoring caution

Scores are interpretations, not official facts. Keep them separate from factual fields.

Recommended scores:

- `affordability_score`
- `speed_score`
- `permanence_score`
- `family_friendliness_score`
- `paperwork_burden_score`
- `policy_stability_score`
- `source_confidence_score`

Each score should have a rationale and should be recalculable from documented rules.

## 12. Field priority

### Must-have

- country;
- program name;
- category;
- status;
- official URL/source;
- last checked;
- minimum funds/income/investment;
- accepted income source;
- job offer requirement;
- degree/experience/language requirement;
- family inclusion;
- work rights;
- initial validity;
- processing time;
- path to PR/citizenship;
- source confidence.

### Should-have

- physical presence requirement;
- spouse work rights;
- tax note;
- healthcare note;
- quota/cap;
- document burden;
- policy stability;
- occupation list links;
- points calculation fields.

### Later

- lifestyle scores;
- cost of living;
- safety/climate/healthcare external indexes;
- user reviews/community;
- saved profiles/accounts;
- professional marketplace.
