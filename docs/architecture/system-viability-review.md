# System Viability Review

## Verdict

World Immigrant can work as a static-first, source-cited immigration knowledge system and can scale to roughly 1,000 programs without introducing a database, user accounts, or server-side profile processing.

The architecture remains viable only if the canonical dataset, generated artifacts, browser logic, and update automation stay separate:

- Canonical records are the reviewed source of truth.
- Generated pages and JSON are disposable build outputs.
- Compare and filter run from compact generated indexes.
- User profile data remains in the browser.
- Hermes scans registered sources and retains local evidence reports; it never edits canonical data, pushes, opens pull requests, or silently publishes policy changes.

This preserves the initial product vision: useful multi-destination planning, transparent uncertainty, official-source evidence, and privacy without turning the product into a legal eligibility oracle.

## Product Boundaries

World Immigrant provides preliminary, structured decision support. It does not:

- Guarantee eligibility, selection, approval, processing time, or citizenship.
- Replace official instructions or professional legal advice.
- Reproduce every government calculator.
- Store personal profiles.
- Infer missing policy facts.
- Treat a page change as a policy change without evidence review.

The product may expand its facts, comparison dimensions, and supported profile questions when real programs prove the need. Expansion must remain traceable to the same source and uncertainty model.

## Canonical Data Contract

Canonical data uses one JSON file per country, program, and source. Categories remain a single small taxonomy file.

This arrangement is required for:

- Focused pull-request diffs.
- Independent source ownership and review.
- Lower merge-conflict risk.
- Deterministic per-entity generation.
- Country-scoped automation.

Aggregate files in `public/data/` are generated outputs, never editable inputs. No second canonical aggregate is permitted.

Every canonical object is Zod-validated before generation. IDs are stable and human-readable. References are reciprocal:

- A country lists each owned program and official source.
- A program points back to its country and registered sources.
- A source lists the country and programs it supports.

Omission means a field is structurally inapplicable. Applicable but unresolved facts use `unknown`. Conditional exclusions use `not_applicable` only when the condition itself is represented elsewhere.

## Provenance Contract

`field_citations` is the only canonical citation mechanism. Keys are RFC 6901 JSON Pointers. A citation at a parent pointer covers its descendants when the same evidence supports the grouped facts.

For every material program leaf:

- A citation exists at that path or an ancestor path.
- The cited source belongs to the program.
- The citation URL equals the registered source URL.
- A quote or section locator is present.
- Retrieval time is recorded.

Interpretive scores remain separate from legal facts and require a written rationale. They must not be presented as official government scores.

A later evidence-snapshot extension may add immutable snapshot IDs and quote hashes. The system retains complete third-party pages locally for source comparison and human review; canonical policy updates remain manual.

## Freshness Contract

Freshness has two enforcement modes:

- Normal builds report overdue records as warnings so an unrelated correction is not blocked by the passage of time.
- Strict freshness audits fail overdue records and are used by scheduled review workflows.

A successful unchanged source check must not create a public-data change solely to advance a timestamp. Operational check events belong in local automation state or a run report. Canonical `last_checked_at` advances when the source comparison is trustworthy and the record is reviewed under the update workflow.

Future timestamps, active sources without successful check metadata, and inconsistent chronology are invalid.

## Generated Artifact Contract

Generation is deterministic from canonical inputs plus an explicitly supplied generation time. It produces:

- Aggregate category, country, program, and source JSON.
- Per-entity country, program, and source JSON.
- Versioned filter and compare indexes.
- AI-readable `llms.txt` and `llms-full.txt` documents.
- Static country, category, and program pages.

A generation rerun with identical canonical input and the same supplied generation time produces byte-equivalent structured content.

At approximately 1,000 programs, the build remains practical because:

- Astro emits static pages at build time.
- Per-program JSON supports narrow fetches.
- Browser interactions load compact indexes rather than every source record.
- Pagefind indexes rendered text after the Astro build.
- Cloudflare serves immutable static assets and pages without per-request computation.

If an index later becomes too large, it can be partitioned by country or category without changing canonical data or page URLs.

## Compare Contract

Compare is a deterministic projection of canonical facts. It:

- Resolves only known program IDs.
- Uses stable row definitions.
- Aligns selected programs by row rather than by object shape.
- Displays `unknown`, `variable`, `limited`, and `not_applicable` explicitly.
- Retains source pointers, source confidence, and last-checked dates.

Compare does not rank programs as universally best. Any future ranking must disclose weights and remain optional.

## Filter Contract

Filtering means “check modeled facts for known blockers,” not “determine legal eligibility.”

The five states are:

- `likely_match`: no known modeled blocker; not a guarantee.
- `possible_match`: non-critical profile facts are missing.
- `not_match`: a known modeled hard requirement fails.
- `needs_review`: a program-specific calculation, conditional rule, or human review is required.
- `unknown`: official policy evidence is unresolved.

Every reason includes source pointers. Complex government ranking systems remain explicit profile inputs or `needs_review`; World Immigrant does not approximate them. The Canada Federal Skilled Worker slice therefore asks for the program selection-factor score but does not duplicate the full Express Entry or CRS calculators.

All profile evaluation runs in the browser. No profile field is sent to a server or written to canonical data.

## Internationalization Contract

English is required for canonical publication. Additional localized values may be added per field. The browser chooses a supported locale from the URL and `navigator.language`, then falls back to English.

Locale routing and fallback remain custom and deterministic. Translation must not change IDs, numeric policy facts, source links, or citation ownership. Translated legal summaries require review against the cited evidence.

## Hermes Update Contract

The safe updater has a deterministic stage before an AI stage:

1. Select due active sources in priority and ID order.
2. Fetch and normalize registered sources as untrusted content.
3. Record final URL, response metadata, extraction method, and versioned hashes.
4. Exit without a content change when normalized evidence is unchanged.
5. Produce a bounded evidence report when evidence changes.
6. Let Hermes produce a bounded local evidence report only.
7. Keep canonical data and generated artifacts unchanged during the cron run.
8. Produce no branch when semantic canonical data is unchanged.
9. Never commit, push, open a pull request, merge, or publish from the cron run.
10. Review and commit any canonical update manually outside the cron run.

Cron must operate from a dedicated clone or disposable worktree, not a human worktree. It requires a repository lock, a source cap, bounded retries, cleanup, duplicate-run detection, and no repository write credential.

The project-level instruction requiring explicit approval for commits and pushes remains authoritative. The updater is intentionally activated only as a scan-only, local-report workflow.

## Failure Behavior

- Fetch failure: retain published facts, record failure, do not mutate policy.
- Extraction failure: retain published facts, request review.
- Hash-only template noise: no canonical change.
- Ambiguous policy change: set review state; do not guess.
- Citation mismatch: fail validation.
- Broken reciprocal reference: fail validation.
- Stale record during normal build: warn.
- Stale record during strict audit: fail.
- Generated drift: fail verification.
- Dirty shared worktree: updater aborts.
- Duplicate branch or run: update the matching run or exit without duplication.
- Validation or build failure: no push.

## Scaling Decision

The architecture is approved for country expansion after the complete Canada vertical slice, compare/filter browser paths, deterministic updater dry-run, and full build verification pass.

No database, search service, account system, server-side filter API, React runtime, or generalized workflow platform is justified before those static boundaries fail under measured load.
