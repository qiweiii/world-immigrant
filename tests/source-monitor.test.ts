import assert from "node:assert/strict";
import test from "node:test";
import { sourceSchema } from "../src/lib/schema";
import {
  classifyContentChange,
  normalizedIncludesQuote,
  normalizeSourceText,
  selectDueSources,
  sha256,
  sourceRunRequiresReview,
} from "../src/lib/sourceMonitor";

function source(overrides: Record<string, unknown> = {}) {
  return sourceSchema.parse({
    id: "source-b",
    country_id: "canada",
    program_ids: ["program"],
    url: "https://example.gov/program",
    title: "Program",
    publisher: "Government",
    source_type: "official",
    language: "en",
    priority: 2,
    update_frequency_days: 7,
    extraction_method: "web_extract",
    last_checked_at: "2026-07-01T00:00:00Z",
    last_success_at: "2026-07-01T00:00:00Z",
    status: "active",
    ...overrides,
  });
}

test("source normalization removes page chrome and stabilizes whitespace", () => {
  const html = `
    <html><head><style>.x{}</style><script>ignore()</script></head>
    <body><header>Navigation changes</header><main><h1>Minimum requirements</h1>
    <p>At least&nbsp;67 points &amp; one year.</p></main><footer>Footer</footer></body></html>`;

  assert.equal(
    normalizeSourceText(html, "text/html"),
    "Minimum requirements\nAt least 67 points & one year.",
  );
});

test("due selection is stable, priority ordered, capped, and ignores inactive sources", () => {
  const sources = [
    source({ id: "source-b", priority: 2 }),
    source({ id: "source-a", priority: 1 }),
    source({ id: "source-c", priority: 1, status: "deprecated" }),
    source({ id: "source-z", priority: 1, last_success_at: "2026-07-09T00:00:00Z" }),
  ];

  assert.deepEqual(
    selectDueSources(sources, new Date("2026-07-10T00:00:00Z"), 2).map(({ id }) => id),
    ["source-a", "source-b"],
  );
});

test("content hashes and change states are deterministic", () => {
  const digest = sha256("policy evidence");
  assert.equal(digest.length, 64);
  assert.equal(classifyContentChange(undefined, digest), "first_seen");
  assert.equal(classifyContentChange(digest, digest), "unchanged");
  assert.equal(classifyContentChange("0".repeat(64), digest), "content_changed");
});

test("quote verification tolerates whitespace and case but rejects paraphrases", () => {
  const source = "Minimum requirements\nAt least 67 points are required.";
  assert.equal(normalizedIncludesQuote(source, "at least   67 POINTS are required."), true);
  assert.equal(normalizedIncludesQuote(source, "Applicants need a passing score."), false);
});

test("source run review flags include collection failures and evidence warnings", () => {
  assert.equal(sourceRunRequiresReview("unchanged"), false);
  assert.equal(sourceRunRequiresReview("not_modified"), false);
  assert.equal(sourceRunRequiresReview("content_changed"), true);
  assert.equal(sourceRunRequiresReview("fetch_failed"), true);
  assert.equal(sourceRunRequiresReview("domain_rejected"), true);
  assert.equal(sourceRunRequiresReview("extraction_required"), true);
  assert.equal(sourceRunRequiresReview("first_seen", ["missing heading"]), true);
});
