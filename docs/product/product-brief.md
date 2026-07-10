# World Immigrant — Product Brief

## 1. One-line positioning

World Immigrant is an immigration-pathway knowledge base designed for people comparing residency and visa options across countries. It focuses on structured, cited, filterable data and avoids generic travel-guide content.

## 2. Product principles

0. **Public good first**: This is public infrastructure, not a lead-gen blog; the goal is to help more people have multi-destination options in times of conflict, instability, and high mobility.
1. **Truth first**: All policy content must be traceable to official or highly credible sources.
2. **Real-time / near real-time**: Check key sources weekly or every 3 days, recording `last_checked_at` and `last_changed_at`.
3. **Structure first**: Country → Category → Visa / Pathway → structured fields; front-end comparison, filtering, and AI consumption all depend on structured data.
4. **Markdown as the explanation layer**: Field values allow Markdown to express complex policies, exceptions, reference links, and notes.
5. **Citation first**: Every policy description carries citations, avoiding “AI summary with no source.”
6. **Multilingual but no fake localization**: Source facts are stored in canonical language / English / official language first, then translated; citations still point to the original source.
7. **Pure-front-end deployable**: No runtime backend, no database service; deployable to Cloudflare Workers.
8. **AI-native**: The site is for humans and for agents; provide `llms.txt`, structured JSON, a data dictionary, and optional MCP package/skill.

## 3. Target users

### 3.1 Primary users

- People who want to systematically understand immigration / long-term residence options.
- People unsure which pathway fits them: study, skilled, investment, digital nomad, startup, e-Residency, family reunion, etc.
- People willing to read official sources themselves but who need someone to categorize, structure, and compare options first.

### 3.2 Secondary users

- Immigration consultants / content creators who need quick policy lookups and source references.
- AI agents / search engines / GEO/AEO crawlers that need structured, citable data.
- Researchers tracking immigration policy trends across countries.

## 4. Core features

### 4.1 Country and visa pathway browsing

- Country landing page: overview, main immigration categories, last-updated timestamp, list of official sources.
- Category pages: skilled worker, study-to-work, investment, digital nomad, startup, retirement, family reunion, e-Residency, etc.
- Visa / program detail pages: eligibility, funds required, language, education, work experience, processing time, fees, path to permanent residence, path to citizenship, spouse/children, risks and caveats.

### 4.2 Side-by-side comparison

The standout feature: **compare countries/pathways by category**.

Examples:

- Digital nomad: Portugal D8 vs Spain Digital Nomad vs Greece Digital Nomad vs UAE Remote Work.
- Skilled worker: Canada Express Entry vs Australia SkillSelect vs New Zealand Skilled Migrant.
- Investment: different minimum investment amounts, holding periods, residence requirements, PR/citizenship paths.

Comparison dimensions:

- Eligibility
- Funds threshold
- Income threshold
- Language requirement
- Age impact
- Processing time
- Can spouse/children be included
- Allows work / remote work
- Direct permanent residence or not
- PR / citizenship pathway
- Policy stability
- Competition intensity
- Information freshness / confidence

### 4.3 Powerful filter

Users enter their profile to filter:

- Age
- Funds / assets
- Monthly / annual income
- Income source: employed, freelance, business dividends, passive income, remote employer
- Income stability
- Occupation category / shortage occupation
- Education level
- Work experience years
- Language proficiency
- Creative/entrepreneurial track record (for startup, talent, arts pathways)
- Has spouse / children
- Spouse profile
- Willing to study
- Willing to invest
- Accepts physical presence requirement
- Time goal: fastest residence, fastest PR, fastest citizenship
- Risk appetite: low-risk/stable policy vs new program / gray boundary

Filter outputs:

- Likely match (no known blocker, still preliminary)
- Possible match (missing profile or policy information)
- Not a match (with explicit blocking reasons)
- Needs human / lawyer confirmation
- Unknown (data missing or stale)

### 4.4 AI / SEO / GEO / AEO

- `llms.txt`: tell LLMs site structure, data entry points, and citation policy.
- `llms-full.txt` or split markdown: for agents to read in full.
- JSON data API (static files): `/data/index.json`, `/data/countries/{country}.json`.
- Data schema docs: `/schema/visa.schema.json`, `/docs/architecture/data-model.md`.
- Optional repo skill: `skills/use-world-immigrant/SKILL.md` teaching agents how to query data and cite sources.
- Optional MCP: because the project goal is pure front-end, MCP should not be an production runtime dependency; it can be an optional npm package / local MCP server that reads static JSON data.

## 5. Scope

Do not try to cover “every country in the world.” Suggested start:

### Countries

- Canada
- Australia
- New Zealand
- United States
- United Kingdom
- Germany
- Portugal
- Spain
- Netherlands
- Singapore
- Japan
- UAE

### Categories

- Digital Nomad / Remote Work
- Skilled Worker / Points-based immigration
- Study → Work → PR
- Startup / Entrepreneur
- Investor / Golden Visa-like programs
- e-Residency / company-formation-adjacent programs

### Pages

1. Home: positioning + search + popular comparison entry points.
2. Country list.
3. Country detail.
4. Category detail.
5. Visa detail.
6. Compare page.
7. Filter page.
8. Sources page: show all sources, update timestamps, change log.

## 6. Non-goals

- Not legal advice; does not replace a lawyer / consultant.
- No user accounts.
- No backend database.
- No real-time crawler API.
- No paid subscription until content quality is validated.
- Do not auto-publish policy changes to production; PR review required at least early on.
