import { defaultLocale, type Locale, pickLocalized, t, tf, type UiKey } from "../i18n";
import type { buildPublicData } from "./public-data";

type CompareProgram = ReturnType<typeof buildPublicData>["compareIndex"]["programs"][number];

type CompareCitation = {
  source_id: string;
  url: string;
  section?: string;
};

type CompareCell = {
  program_id: string;
  display: string;
  citations: CompareCitation[];
};

export type ComparisonView = {
  columns: Array<{ id: string; title: string; country_id: string }>;
  rows: Array<{ id: string; label: string; cells: CompareCell[] }>;
};

function citationsFor(program: CompareProgram, path: string): CompareCitation[] {
  const matches = Object.entries(program.field_citations)
    .filter(([citationPath]) => citationPath === path || citationPath.startsWith(`${path}/`))
    .flatMap(([, citations]) =>
      citations.map(({ source_id, url, section }) => ({ source_id, url, section })),
    );
  const seen = new Set<string>();
  return matches.filter((citation) => {
    if (seen.has(citation.source_id)) return false;
    seen.add(citation.source_id);
    return true;
  });
}

const enumLabels: Record<Locale, Record<string, string>> = {
  en: {},
  "zh-Hans": {
    temporary_no_pr: "临时身份，不通向永久居留",
    temporary_may_lead_pr: "临时身份，可能通向永久居留",
    residence: "居留",
    direct_pr: "直接永久居留",
    e_status_only: "仅电子身份",
    employer_sponsored: "雇主担保",
    self_sponsored: "自助申请",
    own_company: "自有公司",
    points_invitation: "打分邀请",
    investment: "投资",
    remote_income: "境外远程收入",
    talent_pass: "人才准证",
    e_residency: "电子居民身份",
    other: "其他",
    inside_destination: "目的地境内",
    outside_destination: "目的地境外",
    either: "境内或境外",
    annual: "每年",
    monthly: "每月",
    weekly: "每周",
    under_review: "待复核",
    paused: "暂停",
    closed: "关闭",
  },
};

function enumLabel(value: string, locale: Locale) {
  return enumLabels[locale][value] ?? value.replaceAll("_", " ");
}

function formatPolicy(value: unknown, locale: Locale) {
  if (value === true) return t("compare.value.yes", locale);
  if (value === false) return t("compare.value.no", locale);
  if (value === "unknown") return t("compare.value.unknown", locale);
  if (value === "variable") return t("compare.value.variable", locale);
  if (value === "not_applicable") return t("compare.value.notApplicable", locale);
  if (value === "limited") return t("compare.value.limited", locale);
  if (value === "indirect") return t("compare.value.indirect", locale);
  return String(value);
}

function pathway(program: CompareProgram, locale: Locale) {
  if (program.pr_pathway.available === true) return t("compare.value.directPr", locale);
  return formatPolicy(program.pr_pathway.available, locale);
}

function settlementTrack(program: CompareProgram, locale: Locale) {
  return enumLabel(program.filter.settlement_track, locale);
}

function pathwayMechanism(program: CompareProgram, locale: Locale) {
  return enumLabel(program.pathway_mechanism, locale);
}

function incomeRow(program: CompareProgram, locale: Locale) {
  if (program.income.required === false || program.income.required === "not_applicable") {
    return t("compare.value.noIncome", locale);
  }
  const first = program.income.min_income?.[0];
  if (!first) return formatPolicy(program.income.required, locale);
  const location = program.income.income_location
    ? `; ${tf("compare.value.incomeLocation", locale, {
        location: enumLabel(program.income.income_location, locale),
      })}`
    : "";
  const period = first.period ? ` ${enumLabel(first.period, locale)}` : "";
  return `${formatPolicy(first.amount, locale)} ${first.currency}${period}${location}`;
}

function jobOffer(program: CompareProgram, locale: Locale) {
  return formatPolicy(program.filter.requires_job_offer, locale);
}

function funds(program: CompareProgram, locale: Locale) {
  const first = program.funds.proof_of_funds.find(
    ({ calculation, family_size }) => calculation === "minimum_total" && family_size === 1,
  );
  if (!first) return t("compare.value.noFunds", locale);
  return tf("compare.value.fundsFamily", locale, {
    amount: formatPolicy(first.amount, locale),
    currency: first.currency,
  });
}

function processing(program: CompareProgram, locale: Locale) {
  const { processing_time_months_min: min, processing_time_months_max: max } = program.timeline;
  if (min === "unknown" || max === "unknown" || min === undefined || max === undefined) {
    return t("compare.value.processingUnknown", locale);
  }
  const value = min === max ? String(min) : `${min}–${max}`;
  return tf("compare.value.months", locale, { value });
}

function workRights(program: CompareProgram, locale: Locale) {
  return tf("compare.value.workRights", locale, {
    work: formatPolicy(program.rights.work_allowed, locale),
    remote: formatPolicy(program.rights.remote_work_allowed, locale),
  });
}

function family(program: CompareProgram, locale: Locale) {
  return tf("compare.value.familyRights", locale, {
    partner: formatPolicy(program.family.spouse_or_partner_allowed, locale),
    children: formatPolicy(program.family.children_allowed, locale),
    partnerWork: formatPolicy(program.family.spouse_work_allowed, locale),
  });
}

function citizenship(program: CompareProgram, locale: Locale) {
  const value = formatPolicy(program.citizenship_pathway.available, locale);
  const years = program.citizenship_pathway.min_residence_years;
  return typeof years === "number"
    ? tf("compare.value.citizenshipYears", locale, { value, years })
    : value;
}

const rowDefinitions: Array<{
  id: string;
  labelKey: UiKey;
  citationPath?: string;
  render: (program: CompareProgram, locale: Locale) => string;
}> = [
  {
    id: "settlement_track",
    labelKey: "compare.row.settlementTrack",
    citationPath: "/filter",
    render: settlementTrack,
  },
  {
    id: "pathway_mechanism",
    labelKey: "compare.row.entryMechanism",
    citationPath: "/pathway_mechanism",
    render: pathwayMechanism,
  },
  {
    id: "pathway",
    labelKey: "compare.row.pathwayOutcome",
    citationPath: "/pr_pathway",
    render: pathway,
  },
  {
    id: "job_offer",
    labelKey: "compare.row.jobOffer",
    citationPath: "/filter",
    render: jobOffer,
  },
  {
    id: "income",
    labelKey: "compare.row.income",
    citationPath: "/income",
    render: incomeRow,
  },
  {
    id: "settlement_funds",
    labelKey: "compare.row.funds",
    citationPath: "/funds",
    render: funds,
  },
  {
    id: "processing_time",
    labelKey: "compare.row.processing",
    citationPath: "/timeline",
    render: processing,
  },
  {
    id: "work_rights",
    labelKey: "compare.row.workRights",
    citationPath: "/rights",
    render: workRights,
  },
  { id: "family", labelKey: "compare.row.family", citationPath: "/family", render: family },
  {
    id: "citizenship",
    labelKey: "compare.row.citizenship",
    citationPath: "/citizenship_pathway",
    render: citizenship,
  },
  {
    id: "source_confidence",
    labelKey: "compare.row.sourceConfidence",
    render: (program) => `${program.comparison.source_confidence_score}/5`,
  },
  {
    id: "last_checked",
    labelKey: "compare.row.updated",
    render: (program) => program.freshness.last_checked_at.slice(0, 10),
  },
];

export function buildComparison(
  programs: CompareProgram[],
  selectedIds: string[],
  locale: Locale = defaultLocale,
): ComparisonView {
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
      title: `${pickLocalized(program.official_names, locale)}${
        program.status === "active" ? "" : ` (${enumLabel(program.status, locale)})`
      }`,
      country_id: program.country_id,
    })),
    rows: rowDefinitions.map((row) => ({
      id: row.id,
      label: t(row.labelKey, locale),
      cells: selected.map((program) => ({
        program_id: program.program_id,
        display: row.render(program, locale),
        citations: row.citationPath ? citationsFor(program, row.citationPath) : [],
      })),
    })),
  };
}
