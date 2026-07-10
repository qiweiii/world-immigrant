# World Immigrant — Implementation Plan

## 1. Repository Setup

**Tech Stack:** pnpm v11, Astro, TypeScript, Zod/JSON Schema, Biome, Pagefind, Markdown rendering, GitHub Actions, Cloudflare Workers, Hermes cron/updater scripts.

---

## Phase 0 — Project Ground Rules

### Task 0.1: Keep docs local

**Objective:** Maintain docs in `docs/` and commit/push only with explicit approval.

**Files:**
- Created: `docs/product/product-brief.md`
- Created: `docs/research/competitor-analysis.md`
- Created: `docs/research/source-and-field-examples.md`

**Verification:**

```bash
git status --short
```

Expected: docs appear as uncommitted changes; no commit is created.

### Task 0.2: Update `AGENTS.md`

**Objective:** Update project instructions so agents read these docs before coding.

**Files:**
- Update: `AGENTS.md`

**Suggested content:**
- Link to the project docs.
- Document the architecture, tooling, and .
- Tell agents to ask before commit/push.

---

## Phase 1 — Scaffold Static Site

### Task 1.1: Initialize Astro + TypeScript + Biome

**Objective:** Create a static frontend foundation.

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/pages/index.astro`
- Create: `src/components/`

**Command:**

```bash
pnpm add astro zod
pnpm add -D @biomejs/biome pagefind tsx typescript @types/node
```

**Notes:**

- Use pnpm.
- Avoid Next.js.
- Keep dependencies minimal.

**Verification:**

```bash
pnpm dev --host 0.0.0.0
```

Open via Tailscale or localhost tunnel.

### Task 1.2: Add verification instructions

**Objective:** Prevent agents from running heavy commands casually.

**Files:**
- Modify: `AGENTS.md`

Add:

```md
## Environment

Prefer checks first:
- `pnpm data:validate`
- `pnpm check`
- `pnpm build` only before release/PR or when needed

Do not commit or push without explicit approval.
```

**Verification:** read `AGENTS.md`.

---

## Phase 2 — Data Schema and Validation

### Task 2.1: Define JSON schemas

**Objective:** Make data structure strict before adding lots of content.

**Files:**
- Create: `src/data/schemas/country.schema.json`
- Create: `src/data/schemas/visa.schema.json`
- Create: `src/data/schemas/source.schema.json`

**Content:** Based on `docs/architecture/data-model.md`.

**Verification:** schema files exist and are valid JSON.

### Task 2.2: Add TypeScript types and Zod validators

**Objective:** Validate data in dev and CI.

**Files:**
- Create: `src/lib/schema.ts`
- Create: `tools/validate-data.ts`
- Modify: `package.json`

Script:

```json
{
 "scripts": {
  "data:validate": "tsx tools/validate-data.ts"
 }
}
```

**Verification:**

```bash
pnpm data:validate
```

Expected initially: passes with empty data or fixtures.

### Task 2.3: Add citation coverage validation

**Objective:** Enforce trust requirement.

**Files:**
- Create: `tools/check-citations.ts`
- Modify: `tools/validate-data.ts`

Rules:

- Active visa programs must have at least one source.
- Money/income/age/work/language requirements must cite sources.
- Markdown summary fields must either contain links or field citations.

**Verification:** add a deliberately invalid fixture and ensure validator fails; then remove/fix fixture.

---

## Phase 3 — Seed Data the site

### Task 3.1: Create source registry

**Objective:** List official source URLs to monitor.

**Files:**
- Create: `src/data/sources.json`

Initial countries:

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

**Verification:** `pnpm data:validate`.

### Task 3.2: Create first country + visa fixture

**Objective:** Prove data model with one real program before scaling.

**Files:**
- Create: `src/data/countries/canada.json`
- Create: `src/data/programs/canada-express-entry-fsw.json`

**Requirements:**

- Use official IRCC sources.
- Every material field cited.
- English and zh-Hans summaries.
- Mark uncertain fields as `unknown`.

**Verification:** validator passes; page renders.

---

## Phase 4 — Static Pages

### Task 4.1: Country pages

**Objective:** Render country overview pages from data.

**Files:**
- Create: `src/pages/countries/[country].astro`
- Create: `src/components/CountrySummary.astro`

**Verification:** `/countries/canada` renders from JSON.

### Task 4.2: Visa program pages

**Objective:** Render SEO-friendly visa detail pages.

**Files:**
- Create: `src/pages/programs/[program].astro`
- Create: `src/components/VisaDetail.astro`
- Create: `src/components/SourceCitation.astro`

**Verification:** program page includes source citations and `last_checked_at`.

### Task 4.3: Category pages

**Objective:** Browse by immigration category.

**Files:**
- Create: `src/pages/categories/[category].astro`

**Verification:** `/categories/digital-nomad` and `/categories/skilled-worker` build.

---

## Phase 5 — Compare and Filter

### Task 5.1: Build compare engine

**Objective:** Normalize selected visa programs into comparison rows.

**Files:**
- Create: `src/lib/compareEngine.ts`
- Create: `src/components/islands/CompareBuilder.astro`
- Create: `src/pages/compare.astro`

**Verification:** user can select multiple programs and see key fields side-by-side.

### Task 5.2: Build eligibility filter engine

**Objective:** Match user profile against structured criteria.

**Files:**
- Create: `src/lib/filterEngine.ts`
- Create: `src/components/islands/EligibilityFilter.astro`
- Create: `src/pages/filter.astro`

**Verification:** filter returns `eligible/maybe/not_eligible/needs_review` with reasons and citations.

### Task 5.3: URL search params

**Objective:** Make filter state shareable.

**Options:**

- Simple: hand-roll `URLSearchParams`.
- More robust: introduce a small router/search-param helper only if URL state becomes too complex.

**Recommendation:** Start with hand-rolled typed parser; only add TanStack Router if URL state becomes complex.

---

## Phase 6 — Search, i18n, AI-native Output

### Task 6.1: Add i18n routing

**Objective:** Support at least `en` and `zh-Hans`.

**Files:**
- Create: `src/i18n/locales.ts`
- Create: localized route handling (Astro config/pages)

**Verification:** pages render with correct `<html lang="...">` so Pagefind multilingual indexing works.

### Task 6.2: Add Pagefind

**Objective:** Static full-text multilingual search.

**Files:**
- Create: `src/components/Search.astro` or TypeScript island
- Modify: build script

Script:

```json
{
 "scripts": {
  "build": "astro build && pagefind --site dist"
 }
}
```

**Verification:** after build, search works in preview.

### Task 6.3: Generate `llms.txt`

**Objective:** Make site agent-friendly.

**Files:**
- Create: `tools/generate-llms.ts`
- Generate: `public/llms.txt`
- Generate: `public/llms-full.txt` or chunked files

**Verification:** `public/llms.txt` lists key data entry points and citation policy.

### Task 6.4: Generate static JSON API

**Objective:** Let agents and frontend consume data directly.

**Files:**
- Create: `tools/generate-public-data.ts`
- Generate: `public/data/index.json`
- Generate: `public/data/countries/*.json`
- Generate: `public/data/programs/*.json`
- Generate: `public/schema/*.json`

**Verification:** JSON files exist after generation and match schema.

---

## Phase 7 — Hermes Updater

### Task 7.1: Add updater prompts

**Objective:** Standardize extraction and citation behavior.

**Files:**
- Create: `hermes/prompts/update-country.md`
- Create: `hermes/prompts/translate-fields.md`

**Verification:** prompts include rules from `docs/implementation/hermes-automation.md`.

### Task 7.2: Add deterministic collection script

**Objective:** Let Hermes fetch/check source metadata before LLM extraction.

**Files:**
- Create: `hermes/scripts/collect-source-snapshots.py`

**Verification:** script reads `src/data/sources.json` and outputs due sources + hashes.

### Task 7.3: Add PR helper script

**Objective:** Open PRs via git push and GitHub API.

**Files:**
- Create: `hermes/scripts/open-update-pr.sh`

**Security:** uses environment-based auth configured outside the repo. Never store credentials in repo files.

**Verification:** dry-run mode prints intended branch/title/body without credentials.

### Task 7.4: Configure Hermes cron

**Objective:** Run updater every 3 days for Tier 1 sources.

Command concept:

```text
cronjob create schedule="0 8 */3 * *" workdir="/absolute/path/to/world-immigrant" skills=["immigration-source-update"]
```

Use the absolute path of your local clone. Hermes uses it as the working directory so `AGENTS.md` and project instructions load automatically.

---

## Phase 8 — Deployment

### Task 8.1: GitHub Actions static build

**Objective:** Build on GitHub after merge.

**Files:**
- Create: `.github/workflows/deploy.yml`

**Verification:** action builds static output.

### Task 8.2: Choose hosting

**Decision:** Cloudflare Workers via Workers Static Assets.

No runtime server needed. Workers serves `dist/` directly, supports custom domains, and provides global CDN.

**Files:**

- Create: `wrangler.jsonc`
- Optional: `.github/workflows/deploy.yml` for CI/CD

---

## Decisions

1. Brand/name/domain: “World Immigrant” or choose a more polished name?
2. Domain: `world-immigrant.com`
3. Framework/library: Astro
4. Styling: Tailwind CSS v4
5. UI components: shadcn/ui base variant (CSS-only)
6. Data schema/validation: Zod
7. Linting/formatting: Biome
8. Search: Pagefind
9. Hosting: Cloudflare Workers
10. CMS/updater: Hermes scripts + PR workflow
11. Public-good license: CC BY-SA 4.0 + MIT for code
12. Package manager: pnpm v11

## Recommended Next Step

Execute Phase 1 + Phase 2:

1. Scaffold Astro/TS/Biome.
2. Add data schema + validation.
3. Add one real country/program fixture.
4. Verify with checks.

Then seed Tier 1 countries and move to design/comparison pages.

Then seed Tier 1 countries and run first Hermes updater.
