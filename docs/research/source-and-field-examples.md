# World Immigrant — Source and Field Examples From Competitor Research

## 1. Purpose

This note extracts field ideas from competitor/adjacent products. It is not a content source for final policy data unless each fact is re-checked against official sources.

The useful pattern is: competitors reveal what users care about. Official sources must still validate the actual values.

## 2. Reusable field patterns observed

### 2.1 Citizen Remote quick facts

Citizen Remote’s visa pages expose a useful quick-facts pattern:

- visa length;
- possible to extend;
- who can apply;
- minimum income requirement;
- application time;
- country ratings such as internet infrastructure, stability, cost of living, ease of obtaining visa, taxes.

World Immigrant adaptation:

- Use the quick-facts card layout.
- Make every immigration/legal fact cited.
- Keep lifestyle ratings separate and clearly labeled as external/editorial.

### 2.2 Immigrant Invest comparison tables

Immigrant Invest’s comparison view suggests useful investment/residency fields:

- issued document type;
- processing time;
- residence requirement;
- travel freedom;
- spouse/children/parents inclusion;
- work/business rights;
- tax residence trigger notes;
- investment threshold;
- investment options;
- investment holding period;
- path to PR/citizenship;
- special nuances.

World Immigrant adaptation:

- Use these fields for investor/golden-visa categories.
- Expand equivalent fields for non-investor categories.
- Add affordability and non-HNWI routes so the site is not only for wealthy users.

### 2.3 Nomads.com destination filters

Nomads.com shows the importance of non-legal destination fit:

- cost of living;
- internet speed;
- safety;
- weather/climate;
- healthcare / insurance adjacency;
- community and meetups;
- demographics / lifestyle.

World Immigrant adaptation:

- Do not mix these into legal eligibility.
- Add as secondary destination-fit fields after legal feasibility.
- Prefer external datasets for lifestyle facts when possible.

### 2.4 Passport indexes

Henley and Passport Index show strong mobility dimensions:

- passport strength;
- visa-free access;
- destination comparison;
- passport improvement angle;
- global mobility spectrum.

World Immigrant adaptation:

- Add optional “mobility gain” fields : what travel/residence rights this path unlocks.
- Do not make passport power the only success metric.
- Include people who need residence/work/safety rather than only travel freedom.

### 2.5 Official calculators and consultancy calculators

Australia Home Affairs and Y-Axis illustrate points-calculator UX:

- age;
- language;
- education;
- work experience;
- spouse/adaptability;
- job offer/state sponsorship depending on system;
- score thresholds.

World Immigrant adaptation:

- For countries with official formulas, implement deterministic calculators.
- Show formula source and last checked date.
- Keep unofficial approximations clearly marked.

## 3. Field taxonomy by category

### 3.1 Digital nomad / remote work

Must capture:

- remote income minimum;
- accepted income sources;
- whether employer/client must be outside host country;
- local employment restriction;
- initial validity;
- renewability;
- path to PR/citizenship;
- tax-residency notes;
- accommodation proof;
- health insurance requirement;
- family inclusion and income uplift;
- application location/process;
- processing time;
- criminal record requirement.

### 3.2 Skilled worker / points-based

Must capture:

- points-based or employer-sponsored;
- occupation code taxonomy;
- shortage list requirement;
- degree/credential assessment;
- language test type and threshold;
- work experience minimum;
- job offer requirement;
- age scoring;
- invitation rounds / competition;
- points threshold;
- PR direct or temporary first;
- spouse points/family impact;
- licensing barriers.

### 3.3 Study → work → PR

Must capture:

- eligible study levels;
- tuition/proof-of-funds;
- work rights during study;
- post-study work permit availability;
- length of post-study work rights;
- PR pathways after study;
- eligible institutions/programs;
- spouse/child rights;
- age/language constraints;
- total cost and timeline estimate.

### 3.4 Startup / entrepreneur

Must capture:

- required endorsement/incubator/sponsor;
- business plan requirement;
- minimum investment/capital;
- founder ownership threshold;
- job creation requirement;
- revenue/traction requirement;
- language/education requirements;
- initial validity and renewal milestones;
- PR/citizenship path;
- family inclusion;
- business failure consequences.

### 3.5 Investor / golden visa / CBI/RBI

Must capture:

- investment type: real estate, fund, bonds, donation, business, bank deposit;
- minimum amount;
- fees and due diligence;
- holding period;
- source-of-funds requirement;
- residence requirement;
- document issued: residence permit, PR, citizenship/passport;
- processing time;
- family inclusion including parents;
- work/business rights;
- path to PR/citizenship;
- tax implications;
- policy stability and political risk.

### 3.6 Retirement / passive income

Must capture:

- minimum passive income/pension;
- savings/funds requirement;
- age requirement;
- health insurance;
- work restrictions;
- family inclusion;
- renewability;
- PR/citizenship path;
- tax-residency notes;
- healthcare access.

### 3.7 Family / partner

Must capture:

- sponsor status required;
- recognized relationships;
- marriage/unmarried partner rules;
- income threshold for sponsor;
- children/dependents;
- processing time;
- work rights while pending;
- temporary vs permanent status;
- abuse/domestic violence safeguards if official sources describe them.

### 3.8 Humanitarian / protection

This category requires special caution.

Must capture only high-level official pathways and safe referrals:

- asylum/protection overview;
- official application authority;
- eligibility concepts;
- urgent safety warnings;
- legal aid links;
- do-not-rely-on-this-site disclaimer;
- country-specific official resources.

Do not oversimplify or gamify humanitarian eligibility.

## 4. Recommended first source examples to seed the site

Use official sources for final data. Possible seed programs:

| Country | Category | Program idea | Why useful |
| --- | --- | --- | --- |
| Canada | Skilled | Express Entry / Federal Skilled Worker | High demand, structured criteria, official data. |
| Australia | Skilled | Points-tested skilled migration | Official points calculator exists. |
| Portugal | Digital nomad | D8 / remote work visa | Popular, clear income/pathway questions. |
| Spain | Digital nomad | International telework visa | Popular comparison against Portugal. |
| Germany | Skilled | EU Blue Card / Opportunity Card | Strong skilled route interest. |
| UAE | Remote work | Virtual Work Residence / remote work | Good non-EU comparison. |
| New Zealand | Skilled | Skilled Migrant Category | Points/residence model. |
| UK | Talent/skilled | Skilled Worker / Global Talent | Strong demand and structured official pages. |

## 5. Source hierarchy

Use this hierarchy when resolving conflicts:

1. Law/regulation text.
2. Official immigration department page.
3. Official visa application portal.
4. Official embassy/consulate page.
5. Official calculator/tool.
6. Reputable secondary source, labeled and not treated as final authority.
7. Community/blog/forum only for discovery, never final facts.

## 6. Field confidence labels

Each material field should be able to say:

- source type;
- extraction confidence;
- last checked date;
- whether human reviewed;
- whether conflicting sources exist.

Example:

```json
{
 "field": "income.min_monthly_income",
 "value": 3680,
 "currency": "EUR",
 "source_confidence": 5,
 "extraction_confidence": 4,
 "human_reviewed": false,
 "citations": [
  {
   "source_id": "portugal-official-d8-income",
   "url": "https://example.gov/official-source",
   "quote_md": "...",
   "retrieved_at": "2026-07-08T00:00:00Z"
  }
 ]
}
```

## 7. What not to copy from competitors

Avoid:

- lead-capture-first design;
- unverifiable “best country” rankings;
- hiding source dates;
- mixing lifestyle opinion with legal eligibility;
- making high-net-worth migration the default worldview;
- overstating eligibility;
- publishing uncited AI summaries;
- burying uncertainty.

## 8. What to copy conceptually

Copy the good UX patterns:

- quick facts cards;
- compare tables;
- country/program cards;
- guided eligibility wizard;
- destination scores;
- plain-language explainers;
- “improve my options” framing.

But rebuild them with World Immigrant principles:

- source-cited;
- structured;
- public data;
- transparent uncertainty;
- no account required;
- multi-destination;
- ordinary people included.
