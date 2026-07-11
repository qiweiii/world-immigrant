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
  if (value === "unknown") return "Unknown — confirm with official source";
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

function mechanismLabel(value: string) {
  return value.replaceAll("_", " ");
}

function settlementTrack(program: CompareProgram) {
  return mechanismLabel(program.filter.settlement_track);
}

function pathwayMechanism(program: CompareProgram) {
  return mechanismLabel(program.pathway_mechanism);
}

function incomeRow(program: CompareProgram) {
  if (program.income.required === false || program.income.required === "not_applicable") {
    return "No recurring income minimum in this record";
  }
  const first = program.income.min_income?.[0];
  if (!first) return formatPolicy(program.income.required);
  const location = program.income.income_location
    ? `; income location: ${mechanismLabel(program.income.income_location)}`
    : "";
  return `${formatPolicy(first.amount)} ${first.currency}${first.period ? ` ${first.period}` : ""}${location}`;
}

function jobOffer(program: CompareProgram) {
  return formatPolicy(program.filter.requires_job_offer);
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
  {
    id: "settlement_track",
    label: "Settlement track",
    citationPath: "/filter",
    render: settlementTrack,
  },
  {
    id: "pathway_mechanism",
    label: "Entry mechanism",
    citationPath: "/pathway_mechanism",
    render: pathwayMechanism,
  },
  { id: "pathway", label: "Pathway outcome", citationPath: "/pr_pathway", render: pathway },
  {
    id: "job_offer",
    label: "Job offer required",
    citationPath: "/filter",
    render: jobOffer,
  },
  {
    id: "income",
    label: "Income threshold",
    citationPath: "/income",
    render: incomeRow,
  },
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
    label: "Last updated",
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
