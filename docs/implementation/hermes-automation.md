# Hermes Source Update Automation

## Purpose

Hermes monitors registered immigration sources, detects evidence changes, and retains local reports without editing or publishing high-stakes policy data.

The workflow is `scan_only`, controlled by `automation/hermes-policy.json`:

- Fetch, normalize, hash, retain local snapshots, and report evidence changes.
- Do not edit canonical data, generated artifacts, branches, commits, pushes, pull requests, merges, or auto-merges.
- Keep output local and silent when there is no actionable change or failure.

The repository remains scan-only. Canonical updates are manual repository work after a human reviews the retained evidence.

## Components

### Source registry

Canonical source records live one per file in `src/data/sources/`.

Each active source defines:

- Stable source, country, and program IDs.
- Canonical HTTPS URL.
- Expected redirect domains.
- Publisher, source type, language, and extraction method.
- Priority and review cadence.
- Expected content hints that detect incomplete or wrong extraction.
- Public last-checked and last-success metadata.

Operational hashes and full snapshots do not live in canonical JSON.

### Deterministic collector

`tools/collect-sources.ts`:

1. Loads and validates the canonical registry.
2. Selects due active sources in priority and source-ID order.
3. Uses local monitor state rather than public timestamps to avoid repeatedly fetching an unchanged overdue record.
4. Sends conditional ETag and Last-Modified requests when available.
5. Allows only HTTPS and registered final domains.
6. Applies bounded timeout, response-size, and source-count limits.
7. Removes common HTML page chrome and normalizes policy text.
8. Computes SHA-256 hashes for raw bytes and normalized text.
9. Retains immutable, content-addressed local snapshots.
10. Classifies each source as first seen, unchanged, not modified, content changed, extraction required, fetch failed, or domain rejected.
11. Produces a machine-readable run report.

The default state location is `.source-monitor/`, which is gitignored. A dedicated automation clone may set `WORLD_IMMIGRANT_SOURCE_STATE_DIR` to a persistent local path.

Useful commands:

```bash
pnpm sources:scan
pnpm sources:scan:all -- --limit 12
pnpm sources:scan:all -- --limit 2 --dry-run
```

A first-seen result establishes a baseline and is not itself a policy change. An immediate repeat run must report only unchanged or not-modified sources and `requires_ai_review: false`.

### Evidence verification

Canonical citations may carry:

- Registered source ID and URL.
- JSON Pointer ownership through `field_citations`.
- Section or locator.
- Optional verbatim quote.
- Snapshot ID.
- Optional quote hash.
- Retrieval time.

`pnpm sources:annotate -- --write` attaches current snapshot IDs. It keeps and hashes a `quote_md` value only when that text appears verbatim in the retained normalized snapshot. Unsupported paraphrases are removed while the section locator remains.

`pnpm sources:verify -- --require-snapshot-ids` fails when:

- A referenced snapshot is missing.
- A citation lacks its required snapshot ID.
- A `quote_md` value is not present in the retained evidence.
- A quote hash does not match its quote.

Snapshots are local operational evidence and are not served publicly by default.

### Project updater skill

The installed Hermes skill is `world-immigrant-updater`.

Its versioned source is `automation/skills/world-immigrant-updater/SKILL.md`. The installed copy lives in the active Hermes profile's skill directory.

The skill enforces:

- Untrusted-source handling.
- No inference from missing evidence.
- Dedicated clean automation checkout.
- Approved write paths only.
- Snapshot-backed changed-field citations.
- Full validation and build gates.
- No branch for unchanged canonical data.
- No canonical edits, commit, branch push, force push, pull request, merge, or auto-merge.
- No proactive notification; the current CLI job stores local cron output for later inspection.

## Daily Run Contract

1. Validate canonical data.
2. Select and scan at most five due sources, using the configured source cap.
3. Stop cleanly if no source is due.
4. Stop cleanly if normalized evidence is unchanged.
5. On a changed hash, compare the prior and current retained evidence.
6. Ignore page-template noise.
7. Retain existing policy facts on fetch, extraction, domain, or ambiguity failures.
8. In scan-only mode, report the evidence change and stop.
9. Keep canonical data and generated artifacts unchanged.
10. Include source IDs, snapshot hashes, evidence status, and the exact blocker or change classification in the local report.
11. Return a quiet result when no source is due, evidence is unchanged, or no actionable failure exists.
12. Release locks and clean temporary state before exiting.
13. Exit without a branch, commit, push, pull request, or merge in every case.

## Git Safety

The cron agent must not edit a person's active worktree.

Scan-only mode requires:

- A separate automation clone or disposable worktree based on freshly fetched `origin/main`.
- A repository-level lock.
- Cleanup on success, failure, or interruption.
- No repository write token or unattended GitHub write access.

The current repository instruction and policy both require scan-only behavior. Human-reviewed repository changes happen outside the cron run.

## Required Verification

Every candidate update must pass:

```bash
pnpm data:validate
pnpm data:freshness
pnpm sources:verify -- --require-snapshot-ids
pnpm test
pnpm biome:check
pnpm check
pnpm build
git diff --check
```

The diff must also be scanned for secrets, local home paths, private hostnames, and writes outside the policy allowlist.

## Cron Activation

The Hermes cron job is created paused and local-only. This is intentional because:

- The cron must run from a dedicated automation clone rather than a human checkout.
- The scan-only policy prohibits repository writes, pull requests, merges, and proactive notifications.
- CLI sessions have no live delivery channel; local cron output is saved under `~/.hermes/cron/output/` for later inspection.

Before enabling the job:

1. Review and commit the baseline implementation.
2. Push it to the protected base branch.
3. Create a dedicated automation clone.
4. Move the cron job's `workdir` to that clone.
5. Keep policy in `scan_only` for several manual runs.
6. Test unchanged, changed, fetch-failure, validation-failure, duplicate-run, and cleanup paths.
7. Keep delivery local and do not configure proactive notifications.
8. Enable the job only after the lifecycle tests pass.

The updater never schedules another cron job from inside a cron run.
