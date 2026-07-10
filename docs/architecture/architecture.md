# World Immigrant — Architecture

## 1. Architecture

World Immigrant is a static-first, content-heavy, SEO-sensitive, multilingual immigration pathway knowledge base.

Stack:

- **Astro** static site generation (`output: "static"`).
- **shadcn/ui base components** (CSS-only) + **Tailwind CSS v4** for design tokens and UI patterns.
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
    "build": "astro build && pagefind --site dist",
    "preview": "astro preview --host 0.0.0.0",
    "check": "astro check && tsc --noEmit",
    "data:validate": "tsx tools/validate-data.ts",
    "data:generate": "tsx tools/generate-public-data.ts",
    "llms:generate": "tsx tools/generate-llms.ts"
  }
}
```

Use smaller checks during development:

1. `pnpm data:validate`
2. `pnpm check`
3. `pnpm build` before release or when verifying output

## 4. Data Loading Strategy

- Build-time: Astro reads `src/data/**` and generates pages.
- Client-time: compare/filter islands load compressed indexes from `/data/indexes/*.json`.
- Each visa page is pre-rendered for SEO and AI crawlers.
- Data objects include Markdown fields; render via a Markdown renderer at build time for pages, and optionally client-side for dynamic compare snippets.

## 5. Search and Filtering

### Search

Pagefind indexes static HTML after build. It supports multilingual sites via `html lang`, loads small index chunks client-side, and supports metadata tags and filtering.

### Structured Filter

Eligibility logic lives in a dedicated `filterEngine.ts`:

- Convert visa criteria into normalized predicates.
- Classify result as `eligible`, `maybe`, `not_eligible`, `needs_review`.
- Return exact reasons and citations.
- Keep all thresholds in data, not hardcoded UI.

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
| ARCH-006 | Use shadcn/ui base variant (CSS-only) + Tailwind CSS v4 | Provides design tokens and component patterns without Radix runtime; keeps JS footprint zero for UI components |
| ARCH-007 | MCP is optional/generated, not runtime dependency | Pure static site cannot host MCP server without runtime |
| ARCH-008 | Deploy as static site to Cloudflare Workers | Static output fits content-first product; Workers Static Assets serves `dist/` directly without SSR adapter |

### See also

- `docs/architecture/technical-approach-deep-dive.md` for generated indexes, local profile privacy, AI-native outputs, and validation layers.
- `docs/product/product-brief.md` for product vision and positioning.
- `docs/research/competitor-analysis.md` for competitor-derived positioning.