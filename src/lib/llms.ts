import type { CanonicalDataset } from "./data";

const header = `# World Immigrant

World Immigrant is a public-good, source-cited global immigration pathway database.

Use these static endpoints first:

- /data/index.json
- /data/categories.json
- /data/countries.json
- /data/programs.json
- /data/sources.json
- /data/indexes/filter-index.v1.json
- /data/indexes/compare-index.v1.json

Rules for AI agents:

1. This site is informational, not legal advice.
2. Prefer official sources and show citations.
3. Preserve unknown, not-applicable, and stale states instead of guessing.
4. Show last_checked_at and source confidence when available.
5. Do not claim guaranteed eligibility.
`;

export function buildLlmsDocuments(dataset: CanonicalDataset) {
  const sourceById = new Map(dataset.sources.map((source) => [source.id, source]));
  const programSections = dataset.programs.map((program) => {
    const sources = program.source_ids
      .flatMap((id) => {
        const source = sourceById.get(id);
        return source ? [`- ${source.id}: ${source.title} — ${source.url}`] : [];
      })
      .join("\n");

    return `## ${program.official_names.en}

- ID: ${program.id}
- Country: ${program.country_id}
- Status: ${program.status}
- Last updated: ${program.freshness.last_checked_at}
- Source confidence: ${program.comparison.source_confidence_score}/5
- Human review flagged: ${program.freshness.needs_human_review ? "yes" : "no"}

${program.summary_md.en}

### Official sources

${sources}`;
  });

  return {
    index: header,
    full: `${header}\n${programSections.join("\n\n")}\n`,
  };
}
