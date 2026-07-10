# Hermes Source Update Automation

## Purpose

Hermes monitors registered immigration sources, detects evidence changes, and prepares reviewable updates without silently publishing high-stakes policy changes.

The workflow has two operating modes controlled by `automation/hermes-policy.json`:

- `scan_only`: fetch, normalize, hash, retain local snapshots, and report evidence changes. No canonical edits, commits, pushes, or pull requests.
- `draft_pr`: prepare and validate evidence-backed canonical changes in a dedicated automation clone, then open or update one draft pull request. This mode also requires an explicit unattended-updater exception in `AGENTS.md`.

The repository is configured for `scan_only` until the baseline implementation is committed, pushed, and installed in a dedicated automation clone.

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
- No base-branch push, force push, merge, or auto-merge.
- No commit or draft pull request without explicit policy and repository authorization.
- Deterministic branch and duplicate-pull-request handling after authorization.

## Daily Run Contract

1. Validate canonical data.
2. Select and scan at most five due sources, using the configured source cap.
3. Stop cleanly if no source is due.
4. Stop cleanly if normalized evidence is unchanged.
5. On a changed hash, compare the prior and current retained evidence.
6. Ignore page-template noise.
7. Retain existing policy facts on fetch, extraction, domain, or ambiguity failures.
8. In scan-only mode, report the evidence change and stop.
9. In authorized draft-pull-request mode, create a candidate patch from evidence only.
10. Attach snapshot IDs and verify every verbatim quote.
11. Validate schema, reciprocal references, material citation coverage, and strict freshness.
12. Regenerate public JSON and AI-readable outputs.
13. Run tests, Biome, TypeScript, full Astro/Pagefind build, diff checks, secret checks, and allowed-path checks.
14. Exit without a branch if canonical data has no semantic change.
15. Otherwise open or update one draft pull request and wait for human review.

## Git Safety

The cron agent must not edit a person's active worktree.

Draft-pull-request mode requires:

- A separate automation clone or disposable worktree based on freshly fetched `origin/main`.
- A repository-level lock.
- Recorded base SHA.
- Protected `main`.
- Least-privilege token supplied as `WORLD_IMMIGRANT_TOKEN` outside the repository.
- No force push.
- Matching open-pull-request detection.
- Cleanup on success, failure, or interruption.

The current repository instruction says not to commit or push without explicit user approval. `scan_only` complies with that instruction. Enabling unattended draft pull requests requires a narrow documented exception; it must still prohibit merge and direct base-branch writes.

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

- The implementation currently exists as uncommitted work in the human checkout.
- A dedicated automation clone cannot contain it until the baseline is committed and pushed.
- Draft pull requests are not yet authorized by repository policy.
- CLI sessions have no delivery channel; local cron output is retrieved from the cron-job list.

Before enabling the job:

1. Review and commit the baseline implementation.
2. Push it to the protected base branch.
3. Create a dedicated automation clone.
4. Move the cron job's `workdir` to that clone.
5. Keep policy in `scan_only` for several manual runs.
6. Test unchanged, changed, fetch-failure, validation-failure, duplicate-run, and cleanup paths.
7. Configure a gateway delivery target if proactive notifications are wanted.
8. Add a narrow updater authorization to `AGENTS.md` and change policy to `draft_pr` only if unattended draft pull requests are approved.
9. Enable the job.

The updater never schedules another cron job from inside a cron run.
