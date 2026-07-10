# World Immigrant — Hermes Automation

Use Hermes Agent to periodically gather official immigration information, structure it, translate it, validate it, and open PRs for review.

## 1. Why Automation Needs Human Review

Immigration policy is high-stakes. The automation should **assist**, not silently publish.

Recommended workflow:

1. Hermes checks official sources on a schedule.
2. Hermes extracts source text and snapshots metadata.
3. Hermes compares against current structured data.
4. Hermes proposes JSON/Markdown changes.
5. Validation scripts enforce citations and schema.
6. Hermes opens a GitHub PR.
7. Human reviews and merges.
8. Static site deploys from main.

No direct auto-merge.

## 2. Hermes Capabilities to Use

### 2.1 Web extraction first

Use `web_extract` for normal official HTML/PDF pages when possible:

- Lower overhead than a browser.
- Clean markdown/text output.
- Good for official policy pages and PDFs.

### 2.2 Browser rendering when needed

Use browser tools only when:

- Official page is JS-rendered and `web_extract` misses content.
- There is a dynamic selector/form that reveals policy text.
- Need screenshots/visual confirmation for source pages.

Browser output should not be the only citation; still store final URL, retrieved time, and text/quote.

### 2.3 Terminal/scripts for deterministic checks

Use scripts for:

- URL fetch status checks.
- Hashing source snapshots.
- Schema validation.
- JSON normalization/sorting.
- Citation coverage checks.
- Git diff and PR branch setup.

### 2.4 Skills

Create project-specific skills :

```text
.hermes/ or repo skills/
└── skills/
  ├── immigration-source-update/
  │  └── SKILL.md
  ├── immigration-data-validation/
  │  └── SKILL.md
  └── immigration-translation/
    └── SKILL.md
```

Skill responsibilities:

- `immigration-source-update`: source priority, extraction protocol, citation rules.
- `immigration-data-validation`: schema and citation coverage workflow.
- `immigration-translation`: canonical facts vs localized prose rules.

For public AI consumers, separately generate a website-facing skill:

```text
public/skills/use-world-immigrant/SKILL.md
```

This public skill should teach external agents how to use static JSON data and cite sources. It should not contain private automation credentials.

## 3. Cron / Scheduling

### 3.1 Recommended cadence

- Tier 1 programs (popular / volatile): every 3 days.
- Tier 2 programs: weekly.
- Tier 3 programs: monthly.
- Full source audit: monthly.

### 3.2 Hermes cron shape

Use Hermes cron jobs with `workdir` set to this repo so `AGENTS.md` and project instructions load.

Cron concept:

```json
{
  "name": "world-immigrant-source-update",
  "schedule": "0 8 */3 * *",
  "workdir": "/absolute/path/to/world-immigrant",
  "enabled_toolsets": ["web", "browser", "terminal", "file", "skills"],
  "skills": ["immigration-source-update"],
  "prompt": "Update Tier 1 immigration sources, validate data, and open a PR. Never push to main. Include source citations for every changed field."
}
```

Use the absolute path of your local clone.

Important TUI note: cron jobs scheduled from this Hermes TUI are local-only by default; output is saved but not delivered back into the live TUI. If notifications are wanted, configure Hermes Gateway and use a gateway delivery target such as Telegram/all.

## 4. Source Update Pipeline

### Step 0: Source registry

Maintain `src/data/sources.json`:

```json
{
 "sources": [
  {
   "id": "canada-ircc-express-entry",
   "country_id": "canada",
   "program_ids": ["canada-express-entry-fsw"],
   "url": "https://www.canada.ca/...",
   "source_type": "official",
   "priority": 1,
   "update_frequency_days": 3,
   "extraction_method": "web_extract",
   "language": "en"
  }
 ]
}
```

### Step 1: Collect source snapshots

For each due source:

- Fetch URL.
- Extract clean text/markdown.
- Record HTTP status, final URL, retrieved time.
- Compute hash.
- Store a snapshot in git only if it is small and useful; otherwise store metadata and relevant quoted excerpts.

Possible local path:

```text
src/data/source-snapshots/{source_id}/{YYYY-MM-DD}.md
```

If snapshots grow too much, keep snapshots outside repo and only keep citation quotes in JSON.

### Step 2: Change detection

- If content hash unchanged: update `last_checked_at` only.
- If changed: ask Hermes to diff old vs new and list impacted fields.
- If extraction failed: mark source as `needs_attention`, do not alter policy fields.

### Step 3: Structured extraction

Prompt requirements:

- Extract only claims supported by source text.
- Every field must include citation source id + quote/section.
- Unknown is allowed and preferred over guessing.
- Preserve official program names.
- Separate factual fields from interpretation scores.

### Step 4: Translation/localization

- Generate localized Markdown for user-facing descriptions.
- Keep numbers, dates, official names, and URLs consistent.
- Do not translate legal terms if it would reduce precision; use parenthetical explanation instead.
- All localized text inherits citations from canonical facts.

### Step 5: Validation

Run:

```bash
pnpm data:validate
pnpm llms:generate
pnpm build
```

On the , use this sequence during iteration:

```bash
pnpm data:validate
pnpm check
```

Only run full build before PR if feasible.

### Step 6: PR branch

Branch naming:

```text
data/update-{YYYY-MM-DD}-{country-or-tier}
```

Commit message:

```text
data: update immigration sources for {country/tier}
```

PR body should include:

- Sources checked.
- Sources changed.
- Programs changed.
- Validation results.
- Fields needing human review.
- Token/cost summary if available.

## 5. Secure Git Push

This repo uses HTTPS with environment-based auth. Credentials are stored outside the repo (e.g., in environment variables or agent config). Per-dev auth setup lives in `local-notes/` which is gitignored.

Do not write credentials into any repo file.

## 6. Opening PRs

PRs are opened via git push and GitHub API (no `gh` CLI or SSH keys required).

Options:

1. Push branch, then manually open PR in browser.
2. Use GitHub REST API to open PR programmatically.

Script concept:

```bash
curl -sS -X POST \
 -H "Authorization: Bearer $GITHUB_TOKEN" \
 -H "Accept: application/vnd.github+json" \
 https://api.github.com/repos/qiweiii/world-immigrant/pulls \
 -d '{"title":"data: update immigration sources","head":"data/update-...","base":"main","body":"..."}'
```

Use a `GITHUB_TOKEN` environment variable. Never print or store credentials in repo files.

## 7. Prompt Contract for Updater

Core prompt requirements for every updater run:

```md
You are updating high-stakes immigration policy data.

Rules:
- Official/government sources are preferred.
- Do not invent or infer eligibility criteria beyond the source.
- If a field is unclear, write unknown and add a note.
- Every changed factual field must include citation refs.
- Use Markdown for explanatory fields.
- Preserve source URLs and retrieved timestamps.
- Output must pass schema validation.
- Open a PR; never push directly to main; never auto-merge.
```

## 8. Handling Difficult Sources

### PDFs

Use `web_extract` on PDF URL first. If tables are important, consider a PDF extraction skill/tool.

### JavaScript-heavy pages

Use browser rendering:

- Navigate to page.
- Wait for content.
- Extract visible text.
- Save URL and date.
- Prefer official downloadable PDF/HTML if available.

### Rate limits / blocking

- Respect robots and terms.
- Use low frequency.
- Prefer official feeds/API if available.
- Do not bypass authentication or paywalls.

### Conflicting sources

Priority order:

1. Official immigration department page.
2. Official legal/regulatory text.
3. Official embassy/consulate page.
4. Official PDF/forms/guides.
5. Reputable secondary source only as a pointer, never as primary fact if official source exists.

If sources conflict, mark `needs_human_review: true` and include both citations.

## 9. AI-native Outputs

Generated each build:

```text
public/llms.txt
public/llms-full.txt or public/llms/chunks/*.md
public/data/index.json
public/data/countries/{country}.json
public/data/programs/{program}.json
public/schema/visa.schema.json
public/skills/use-world-immigrant/SKILL.md
```

Optional Phase 2:

```text
packages/world-immigrant-mcp/
```

This package can run a local MCP server over the static data. It is not part of pure frontend runtime.

## 10. Review Checklist

Before any PR:

- [ ] Data schema validates.
- [ ] Every changed field has citations.
- [ ] `last_checked_at` updated.
- [ ] No token/secrets in diff.
- [ ] No source claims without official URL.
- [ ] Unknown fields explicitly marked.
- [ ] Localized fields do not introduce new facts.
- [ ] Build or at least data validation passes.
- [ ] PR body lists human-review items.
