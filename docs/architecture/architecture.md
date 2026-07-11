# World Immigrant — Architecture

## 1. Architecture

World Immigrant is a static-first, content-heavy, SEO-sensitive, multilingual immigration pathway knowledge base.

Stack:

- **Astro** static site generation (`output: "static"`).
- **Local CSS primitives** + **Tailwind CSS v4** for design tokens and UI patterns.
- **Frameworkless TypeScript islands** for comparison, filtering, and other interactive surfaces.
- **Pagefind** for static multilingual full-text search.
- **Hermes Agent** scheduled updaters that collect official sources, structure data, and open PRs for review.

Output is static HTML/CSS/JS + JSON assets, deployable to any static host without a runtime server.

## 2. System Diagram

See `docs/diagrams/system-architecture.mmd` for the canonical system architecture diagram. Render it in the docs viewer or any Mermaid-compatible renderer.

## 3. Build & Runtime

### Runtime

- No server.
- Static HTML + JSON + JS assets.
- Client-side search via Pagefind.
- Compare/filter runs in browser using prebuilt JSON indexes.

### Build Scripts

```json
{
  "scripts": {
    "dev": "astro dev --host 0.0.0.0",
    "build": "pnpm data:validate && pnpm data:generate && pnpm llms:generate && astro build && pagefind --site dist",
    "preview": "astro preview --host 0.0.0.0",
    "check": "astro sync && tsc --noEmit --pretty false",
    "biome:check": "biome check .",
    "data:validate": "tsx tools/validate-data.ts",
    "data:generate": "tsx tools/generate-public-data.ts",
    "llms:generate": "tsx tools/generate-llms.ts",
    "deploy:preview": "pnpm build && wrangler deploy --dry-run",
    "deploy": "pnpm build && wrangler deploy"
  }
}
```

Use smaller checks during development:

1. `pnpm data:validate`
2. `pnpm check`
3. `pnpm build` before release or when verifying output

## 4. Data Loading Strategy

- Canonical countries, programs, and sources use one JSON file per entity under `src/data/{countries,programs,sources}/`; categories remain one controlled taxonomy file.
- Build-time: a shared loader validates canonical entities before Astro and generators consume them.
- Client-time: compare/filter islands load compressed indexes from `/data/indexes/*.json`.
- Each visa page is pre-rendered for SEO and AI crawlers.
- Data objects include Markdown fields; render via a Markdown renderer at build time for pages, and optionally client-side for dynamic compare snippets.
- Generated files under `public/data/` are outputs, never hand-edited sources.

## 5. Search and Filtering

### Search

Pagefind indexes static HTML after build. It supports multilingual sites via `html lang`, loads small index chunks client-side, and supports metadata tags and filtering.

### Structured Filter

Eligibility logic lives in a dedicated `filterEngine.ts`:

- Convert visa criteria into normalized predicates.
- Classify result as `likely_match`, `possible_match`, `not_match`, `needs_review`, or `unknown`.
- Return exact reasons and citations.
- Keep all thresholds in data, not hardcoded UI.
- Treat results as preliminary matching guidance, never a legal eligibility decision.

## 6. i18n Strategy

World Immigrant uses a custom, lightweight i18n layer instead of a third-party i18n framework.

- **Data model**
  - Canonical facts stay locale-independent.
  - User-facing prose is stored as `LocalizedText` keyed by locale (`en`, `zh-Hans`, then `es`, `fr`, `de`, `pt`, `ja`, `ko`, etc.).
  - UI strings live in `src/i18n/ui.ts`.
- **Routing**
  - Each locale has its own path (`/en/countries/canada`, `/zh-Hans/countries/canada`).
  - `en` is also served from root paths (`/countries/canada`).
  - A locale selector island navigates between equivalent paths.
- **Language detection**
  - On first visit to a root path, the site reads `navigator.language`.
  - It picks the closest supported locale and redirects to that path.
  - Unsupported languages fall back to `en`.
- **Rules**
  - Never translate source URLs or official program names unless an official localized name exists.
  - Filter/compare/eligibility logic always uses canonical fields.
  - Hermes translates only localized prose and inherits citations.

Astro's file-based routing and static output make a third-party i18n library unnecessary.

## 7. Deployment

Canonical domain: `https://world-immigrant.com`

Target: **Cloudflare Workers**

- Static export from `dist/` via `output: "static"` in `astro.config.mjs`.
- `wrangler.jsonc` maps `./dist` as Workers Static Assets.
- Cloudflare Workers connects directly to the GitHub repo, runs `pnpm build`, and deploys the `dist/` output automatically on pushes to `main`.
- `pnpm deploy` and `pnpm deploy:preview` are still available for manual or dry-run deploys.
- No `@astrojs/cloudflare` adapter is needed because the site is fully static.
- `dist/` stays in `.gitignore`; Cloudflare builds it in its own CI environment.

### SSR / on-demand rendering

Not used. SSR would only make sense for user accounts, saved shortlists, or real-time data that cannot be pre-built. If added, install `@astrojs/cloudflare` and switch to `output: "server"`.

## 8. Operational Model

- GitHub repo is source of truth.
- Cloudflare Workers builds and hosts the output on push to `main`.
- Hermes cron opens PRs; human review merges.

No backend secrets are needed in frontend hosting.

## 9. Architecture Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| ARCH-001 | Use Astro + frameworkless TypeScript islands, not Next.js | Content-heavy, static, SEO/AEO important, strict pnpm supply-chain checks blocked current React/Preact integration chains |
| ARCH-002 | Store immigration data as structured JSON/YAML + Markdown fields | Supports compare/filter while preserving nuanced policy text |
| ARCH-003 | Require citation arrays on every material policy field | Trust and source-of-truth are the brand |
| ARCH-004 | Hermes creates PRs instead of directly pushing to main | Policy data is high-stakes; human review needed |
| ARCH-005 | Use Pagefind for static multilingual full-text search | No backend search infra; supports multilingual static sites |
| ARCH-006 | Use local CSS primitives + Tailwind CSS v4 | Keeps the UI frameworkless, ownable, and free of component-library runtime dependencies |
| ARCH-007 | MCP is optional/generated, not runtime dependency | Pure static site cannot host MCP server without runtime |
| ARCH-008 | Deploy as static site to Cloudflare Workers | Static output fits content-first product; Workers Static Assets serves `dist/` directly without SSR adapter |
| ARCH-009 | Use one canonical JSON file per country, program, and source | Narrow diffs reduce review conflicts and let scheduled updates target one policy object at a time |
| ARCH-010 | Use JSON Pointer keys in `field_citations` as the sole factual-field provenance mechanism | One citation system avoids drift between inline and object-level citations and supports deterministic coverage checks |
| ARCH-011 | Keep freshness reporting separate from build-blocking integrity validation | Stale data must be visible and escalated without blocking unrelated corrections; strict freshness audits run explicitly and in automation |
| ARCH-012 | Store full source snapshots in a gitignored cache and retain hashes, retrieval metadata, and quoted evidence in canonical data | Keeps the public repository reviewable while preserving enough provenance for change detection and human review |
| ARCH-013 | Make Hermes propose reviewed branches/PRs only | Deterministic scripts collect and validate; the agent interprets evidence, but never auto-merges or pushes directly to `main` |

### See also

- `docs/architecture/technical-approach-deep-dive.md` for generated indexes, local profile privacy, AI-native outputs, and validation layers.
- `docs/product/product-brief.md` for product vision and positioning.
- `docs/research/competitor-analysis.md` for competitor-derived positioning.