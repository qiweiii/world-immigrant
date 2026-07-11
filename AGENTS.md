# World Immigrant

## Before coding

Read the relevant docs in `docs/` before making changes. Start with `docs/product/`, then `docs/architecture/`, then `docs/implementation/`.

Design diagrams live in `docs/diagrams/`. Per-dev environment notes live in `local-notes/` (gitignored, never commit).

## Architecture

This project is a static-first public-good immigration information site:

- Astro static pages for crawlable country/category/program content.
- Frameworkless Astro/TypeScript islands for interactive compare/filter experiences; add React/Preact if needed and supply-chain checks pass.
- Structured source data in `src/data/`.
- Generated public JSON in `public/data/`.
- `llms.txt` / `llms-full.txt` for AI-readable public data access.
- Pagefind for static full-text search.
- Hermes updater runs scan-only: it never edits canonical data, pushes, opens pull requests, merges, or silently publishes high-stakes policy changes.

## Tooling

Use pnpm only. Do not use npm/yarn for project-level installs.

- Package manager: `pnpm@11.10.0`
- The project avoids React/Preact integration because strict pnpm trust checks currently block their Babel-based integration chain.
- Lint/format: Biome
- Fast verification: `pnpm data:validate`, `pnpm biome:check`, `pnpm check`

## UI styling

The site uses local Astro components and local CSS primitives. It does not depend on a component library.

- `src/styles/global.css` holds theme tokens, dark-mode tokens, base element rules, and shared local primitives such as `.btn`, `.card`, `.badge`, `.input`, `.panel`, and `.table`.
- For normal product work, prefer page-, feature-, or component-specific selectors over global primitive or token changes.
- Do not add a UI component-library runtime, generator, or generated component set without an explicit architecture decision and dependency review.

## Environment

Prefer checks first:

1. `pnpm data:validate`
2. `pnpm biome:check`
3. `pnpm check`

Run full `pnpm build` only when needed for release/PR verification. Avoid memory-heavy framework experiments.

## Local notes

Per-dev environment setup (git auth, preview servers, SSH/Tailscale, tokens, etc.) lives in `local-notes/` — gitignored, never committed. Check there for machine-specific instructions.

Do not commit or push without explicit user approval.
