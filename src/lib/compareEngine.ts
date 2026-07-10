import type { buildPublicData } from "./public-data";

type CompareProgram = ReturnType<typeof buildPublicData>["compareIndex"]["programs"][number];

type CompareCell = {
  program_id: string;
  display: string;
  citations: string[];
};

export type ComparisonView = {
  columns: Array<{ id: string; title: string; country_id: string }>;
  rows: Array<{ id: string; label: string; cells: CompareCell[] }>;
};

function citationsFor(program: CompareProgram, path: string): string[] {
  return [
    ...new Set(
      Object.entries(program.field_citations)
        .filter(([citationPath]) => citationPath === path || citationPath.startsWith(`${path}/`))
        .flatMap(([, citations]) => citations.map(({ source_id }) => source_id)),
    ),
  ];
}

function formatPolicy(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === "unknown") return "Unknown — verify with official source";
  if (value === "variable") return "Variable";
  if (value === "not_applicable") return "Not applicable";
  if (value === "limited") return "Limited or conditional";
  if (value === "indirect") return "Indirect pathway";
  return String(value);
}

function pathway(program: CompareProgram) {
  if (program.pr_pathway.available === true) return "Direct permanent residence";
  return formatPolicy(program.pr_pathway.available);
}

function funds(program: CompareProgram) {
  const first = program.funds.proof_of_funds.find(
    ({ calculation, family_size }) => calculation === "minimum_total" && family_size === 1,
  );
  if (!first) return "No fixed minimum published in this record";
  return `${formatPolicy(first.amount)} ${first.currency} for family size 1; varies by family size`;
}

function processing(program: CompareProgram) {
  const { processing_time_months_min: min, processing_time_months_max: max } = program.timeline;
  if (min === "unknown" || max === "unknown" || min === undefined || max === undefined) {
    return "Unknown — use the current official processing-times tool";
  }
  return min === max ? `${min} months` : `${min}–${max} months`;
}

function workRights(program: CompareProgram) {
  return `Work: ${formatPolicy(program.rights.work_allowed)}; remote work: ${formatPolicy(program.rights.remote_work_allowed)}`;
}

function family(program: CompareProgram) {
  return `Partner: ${formatPolicy(program.family.spouse_or_partner_allowed)}; children: ${formatPolicy(program.family.children_allowed)}; partner work: ${formatPolicy(program.family.spouse_work_allowed)}`;
}

function citizenship(program: CompareProgram) {
  const years = program.citizenship_pathway.min_residence_years;
  const suffix = typeof years === "number" ? `; minimum residence modeled: ${years} years` : "";
  return `${formatPolicy(program.citizenship_pathway.available)}${suffix}`;
}

const rowDefinitions: Array<{
  id: string;
  label: string;
  citationPath?: string;
  render: (program: CompareProgram) => string;
}> = [
  { id: "pathway", label: "Pathway outcome", citationPath: "/pr_pathway", render: pathway },
  {
    id: "settlement_funds",
    label: "Settlement funds",
    citationPath: "/funds",
    render: funds,
  },
  {
    id: "processing_time",
    label: "Processing time",
    citationPath: "/timeline",
    render: processing,
  },
  { id: "work_rights", label: "Work rights", citationPath: "/rights", render: workRights },
  { id: "family", label: "Family", citationPath: "/family", render: family },
  {
    id: "citizenship",
    label: "Citizenship pathway",
    citationPath: "/citizenship_pathway",
    render: citizenship,
  },
  {
    id: "source_confidence",
    label: "Source confidence",
    render: (program) => `${program.comparison.source_confidence_score}/5`,
  },
  {
    id: "last_checked",
    label: "Last checked",
    render: (program) => program.freshness.last_checked_at.slice(0, 10),
  },
];

export function buildComparison(programs: CompareProgram[], selectedIds: string[]): ComparisonView {
  const byId = new Map(programs.map((program) => [program.program_id, program]));
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length > 3) {
    throw new Error("Compare supports at most three distinct programs");
  }
  const selected = uniqueIds.map((id) => {
    const program = byId.get(id);
    if (!program) throw new Error(`Unknown program: ${id}`);
    return program;
  });

  return {
    columns: selected.map((program) => ({
      id: program.program_id,
      title: `${program.official_names.en}${program.status === "active" ? "" : ` (${program.status})`}`,
      country_id: program.country_id,
    })),
    rows: rowDefinitions.map((row) => ({
      id: row.id,
      label: row.label,
      cells: selected.map((program) => ({
        program_id: program.program_id,
        display: row.render(program),
        citations: row.citationPath ? citationsFor(program, row.citationPath) : [],
      })),
    })),
  };
}
