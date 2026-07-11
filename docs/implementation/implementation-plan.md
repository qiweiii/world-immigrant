# World Immigrant — Implementation Plan

## 1. Repository Setup

**Tech Stack:** pnpm v11, Astro, TypeScript, Zod, Biome, Pagefind, Tailwind CSS v4, Cloudflare Workers, Hermes cron/updater scripts.

---

## Phase 0 — Project Ground Rules

### Task 0.1: Maintain project documentation

**Objective:** Keep product, architecture, implementation, research, and diagram docs organized under `docs/`. Commit or push only with explicit approval.

**Verification:** Check internal doc references after moving or renaming files.

### Task 0.2: Update `AGENTS.md`

**Objective:** Update project instructions so agents read these docs before coding.

**Files:**
- Update: `AGENTS.md`

**Content:**
- Tell agents to read relevant files under `docs/`.
- Document architecture, tooling, and verification commands.
- Tell agents to ask before commit/push.

---

## Phase 1 — Scaffold Static Site

Current state: the Astro/TypeScript/Biome/Tailwind/Pagefind foundation is implemented. Maintain this section as the baseline contract.

### Task 1.1: Initialize Astro + TypeScript + Biome

**Objective:** Create a static frontend foundation.

**Files:**
- Maintain: `package.json`
- Maintain: `astro.config.mjs`
- Maintain: `tsconfig.json`
- Maintain: `src/pages/index.astro`
- Maintain: `src/components/`

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

Current state: executable Zod schemas and cross-file validation live in `src/lib/schema.ts` and `tools/validate-data.ts`.

### Task 2.1: Define canonical Zod schemas

**Objective:** Keep the executable data contract aligned with `docs/architecture/data-model.md` before adding country coverage.

**Files:**
- Maintain: `src/lib/schema.ts`

**Verification:** `pnpm data:validate` parses every canonical data file.

### Task 2.2: Maintain TypeScript types and Zod validation

**Objective:** Validate data during development and every production build.

**Files:**
- Maintain: `src/lib/schema.ts`
- Maintain: `tools/validate-data.ts`
- Maintain: `package.json`

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

Expected: validates schemas and cross-file references; empty canonical datasets remain valid until the first complete fixture is added.

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

Current state: category taxonomy exists; country, program, and source datasets are empty.

### Task 3.1: Create source registry

**Objective:** List official source URLs to monitor.

**Files:**
- Maintain: `src/data/sources.json`

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

Current state: page and island shells exist. Complete data-driven comparison and eligibility logic against the first validated fixture.

### Task 5.1: Build compare engine

**Objective:** Normalize selected visa programs into comparison rows.

**Files:**
- Create: `src/lib/compareEngine.ts`
- Maintain: `src/components/islands/CompareBuilder.astro`
- Maintain: `src/pages/compare.astro`

**Verification:** user can select multiple programs and see key fields side-by-side.

### Task 5.2: Build eligibility filter engine

**Objective:** Match user profile against structured criteria.

**Files:**
- Maintain: `src/lib/filterEngine.ts`
- Maintain: `src/components/islands/EligibilityFilter.astro`
- Maintain: `src/pages/filter.astro`

**Verification:** filter returns `likely_match/possible_match/not_match/needs_review/unknown` with reasons and citations.

### Task 5.3: URL search params

**Objective:** Make filter state shareable.

**Options:**

- Simple: hand-roll `URLSearchParams`.
- More robust: introduce a small router/search-param helper only if URL state becomes too complex.

**Recommendation:** Start with hand-rolled typed parser; only add TanStack Router if URL state becomes complex.

---

## Phase 6 — Search, i18n, AI-native Output

Current state: Pagefind indexing, public JSON generation, AI-readable output, and path-based i18n (`en` unprefixed + `zh-Hans` prefix) with a header language switcher exist. Search UI polish remains.

### Task 6.1: Add i18n routing

**Objective:** Support at least `en` and `zh-Hans`.

**Status:** Implemented.

**Files:**
- Maintain: `src/i18n/` (`locales`, `paths`, `resolve`, `ui`)
- Maintain: `src/components/LanguageSwitcher.astro`, locale-aware `Layout.astro`
- Maintain: unprefixed pages + `src/pages/[locale]/…` mirrors

**Verification:** `/` and `/zh-Hans` render with correct `<html lang>`; switcher preserves path; `localStorage.wi-locale` remembers choice.

### Task 6.2: Add Pagefind search UI

**Objective:** Expose the Pagefind index through a multilingual search interface. Pagefind generation is already part of the build.

**Files:**
- Create: `src/components/Search.astro` or TypeScript island
- Maintain: build script

Script:

```json
{
 "scripts": {
  "build": "astro build && pagefind --site dist"
 }
}
```

**Verification:** after build, search works in preview.

### Task 6.3: Expand generated AI-readable output

**Objective:** Keep the existing `llms.txt` output synchronized with complete country and program data.

**Files:**
- Maintain: `tools/generate-llms.ts`
- Generate: `public/llms.txt`
- Generate: `public/llms-full.txt` or chunked files

**Verification:** `public/llms.txt` lists key data entry points and citation policy.

### Task 6.4: Expand the static JSON API

**Objective:** Keep existing generated endpoints synchronized and add per-country/program artifacts after the first complete fixture.

**Files:**
- Maintain: `tools/generate-public-data.ts`
- Generate: `public/data/index.json`
- Generate: `public/data/countries.json` and per-country files
- Generate: `public/data/programs.json` and per-program files
- Generate: public schemas when the canonical Zod contract stabilizes

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

### Task 7.3: Keep updater scan-only

**Objective:** Keep scheduled source checks local and prevent unattended repository writes.

**Files:**
- Maintain: `automation/hermes-policy.json`
- Maintain: `automation/skills/world-immigrant-updater/SKILL.md`
- Maintain: `docs/implementation/hermes-automation.md`

**Security:** no repository write token is required for the scan-only workflow. Never store credentials in repo files.

**Verification:** unchanged runs retain local snapshots and reports without modifying canonical data, creating branches, opening pull requests, or merging.

### Task 7.4: Configure Hermes cron

**Objective:** Run the scan-only updater on the configured schedule from a dedicated automation clone.

Command concept:

```text
cronjob create schedule="15 6 * * *" workdir="/absolute/path/to/world-immigrant-automation" skills=["world-immigrant-updater"]
```

Use the absolute path of the dedicated automation clone. Hermes uses it as the working directory so `AGENTS.md` and project instructions load automatically. Keep delivery local and inspect saved reports manually.

---

## Phase 8 — Deployment

### Task 8.1: Connect Cloudflare Workers to GitHub

**Objective:** Let Cloudflare build and deploy automatically on pushes to `main`.

**Configuration:**
- Build command: `pnpm build`
- Output directory: `dist`
- Workers Static Assets config: `wrangler.jsonc`

**Verification:** a push to `main` triggers a successful Cloudflare build and deployment. No GitHub Actions workflow is required.

### Task 8.2: Configure the custom domain

Connect `world-immigrant.com` in Cloudflare after the domain is purchased.

---

## Decisions

1. Brand/name: World Immigrant
2. Domain: `world-immigrant.com`
3. Framework/library: Astro
4. Styling: Tailwind CSS v4
5. UI primitives: local CSS components and tokens
6. Data schema/validation: Zod
7. Linting/formatting: Biome
8. Search: Pagefind
9. Hosting: Cloudflare Workers
10. CMS/updater: Hermes scripts + human-reviewed PR workflow
11. Public-good license: CC BY-SA 4.0 + MIT for code
12. Package manager: pnpm v11

## Recommended Next Step

1. Reconcile the architecture, data-model specification, and executable Zod schemas.
2. Define canonical filter states, unknown semantics, and citation rules.
3. Implement deterministic reference, citation, and freshness validation.
4. Add one complete country/program fixture from official sources.
5. Generate and verify pages, public artifacts, compare/filter behavior, and Hermes updates against that fixture.
6. Scale country coverage only after the complete vertical slice works.
