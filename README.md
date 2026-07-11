# World Immigrant

A source-cited, multilingual, AI-readable immigration pathway database built as a public good.

> **License:** MIT

## What this is

World Immigrant helps people discover and compare lawful immigration pathways across countries. The goal is to give everyone realistic multi-destination options in a changing world by organizing official sources, filterable criteria, and clear citations in one open place.

## Core principles

- **Official-source first.** Every material claim links to a government, embassy, or reputable secondary source.
- **Citation-first data model.** Each program stores sources, confidence, last-checked date, and change history.
- **Privacy-first filtering.** Eligibility filtering runs in the browser; no profile data is sent to a server.
- **Public good.** Open source, AI-readable (`llms.txt`), and designed for contribution.
- **Not legal advice.** The site surfaces information; users confirm details with qualified professionals.

## Tech stack

- **Framework:** Astro static site (`output: "static"`)
- **UI primitives:** Local CSS components and tokens
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Validation:** Zod
- **Lint/Format:** Biome
- **Search:** Pagefind (static, multilingual)
- **Package manager:** pnpm v11
- **Deployment:** Cloudflare Workers static assets
- **Data updates:** Hermes Agent scheduled crawlers that open PRs for human review

## Quick start

```bash
pnpm install
pnpm check    # type check + astro sync
pnpm build    # build static site + generate data + search index
pnpm preview   # preview locally
```

## Contribution

- Data changes come via PR; Hermes automation never auto-merges to `main`.
- Do not commit secrets, tokens, or per-dev environment details.

## Disclaimer

World Immigrant is an information resource, not legal advice. Immigration law changes frequently; always verify requirements with official sources and qualified professionals before acting.