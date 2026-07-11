import { defaultLocale, type Locale, tf, type UiKey } from "../i18n";
import type { buildPublicData } from "./public-data";

export type FilterResultStatus =
  | "likely_match"
  | "possible_match"
  | "not_match"
  | "needs_review"
  | "unknown";

export type CitationRef = {
  source_id: string;
  url: string;
  section?: string;
};

export type FilterReason = {
  field: string;
  severity: "positive" | "warning" | "blocking" | "unknown";
  message: string;
  citations: CitationRef[];
};

export type FilterResult = {
  program_id: string;
  status: FilterResultStatus;
  score: number;
  reasons: FilterReason[];
};

export type EducationLevel =
  | "none"
  | "secondary"
  | "vocational"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "professional_license";

export type UserProfile = {
  goal: "temporary_stay" | "renewable_residence" | "permanent_residence" | "citizenship";
  /** When set and non-empty, only programs in these categories are evaluated. */
  category_ids?: string[];
  skilled_work_years?: number;
  has_approved_language_test?: boolean;
  language_benchmark?: number;
  education_level?: EducationLevel;
  foreign_education?: boolean;
  has_eca?: boolean;
  program_selection_points?: number;
  family_size?: number;
  liquid_funds?: { amount: number; currency: string };
  authorized_to_work_in_country?: boolean;
  valid_job_offer?: boolean;
};

type FilterIndexProgram = ReturnType<typeof buildPublicData>["filterIndex"]["programs"][number];

type ExemptionCondition = "authorized_to_work_in_country" | "valid_job_offer";

const educationRank: Record<EducationLevel, number> = {
  none: 0,
  secondary: 1,
  vocational: 2,
  associate: 3,
  bachelor: 4,
  master: 5,
  doctorate: 6,
  professional_license: 6,
};

const FIELD_CITATION_PATHS: Record<string, string[]> = {
  goal: ["/filter", "/timeline", "/rights", "/pr_pathway", "/citizenship_pathway"],
  settlement_track: ["/filter", "/pathway_mechanism", "/pr_pathway"],
  pathway_mechanism: ["/pathway_mechanism", "/filter"],
  job_offer: ["/eligibility", "/filter"],
  income: ["/income", "/filter"],
  work_experience: ["/eligibility", "/eligibility/work_experience", "/filter"],
  language_test: ["/eligibility", "/eligibility/language", "/filter"],
  language_benchmark: ["/eligibility", "/eligibility/language", "/filter"],
  education: ["/eligibility", "/eligibility/education", "/filter"],
  credential_assessment: ["/eligibility", "/eligibility/education", "/filter"],
  program_selection_points: ["/eligibility", "/filter"],
  settlement_funds: ["/funds", "/filter"],
  content_review: ["/filter", "/status"],
  program_status: ["/status", "/filter"],
};

function citationsForField(program: FilterIndexProgram, field: string): CitationRef[] {
  const preferred = FIELD_CITATION_PATHS[field] ?? ["/filter"];
  const matches = preferred.flatMap((path) =>
    Object.entries(program.field_citations)
      .filter(([citationPath]) => citationPath === path || citationPath.startsWith(`${path}/`))
      .flatMap(([, citations]) =>
        citations.map(({ source_id, url, section }) => ({ source_id, url, section })),
      ),
  );
  if (matches.length) {
    const seen = new Set<string>();
    return matches.filter((c) => {
      if (seen.has(c.source_id)) return false;
      seen.add(c.source_id);
      return true;
    });
  }
  const fallback = Object.values(program.field_citations)
    .flat()
    .map(({ source_id, url, section }) => ({ source_id, url, section }));
  const seen = new Set<string>();
  return fallback.filter((c) => {
    if (seen.has(c.source_id)) return false;
    seen.add(c.source_id);
    return true;
  });
}

function requiredFunds(program: FilterIndexProgram, familySize: number) {
  const rows = program.criteria.proof_of_funds;
  const exact = rows.find(
    (row) => row.calculation === "minimum_total" && row.family_size === familySize,
  );
  if (exact && typeof exact.amount === "number") {
    return { amount: exact.amount, currency: exact.currency };
  }

  const base = [...rows]
    .filter(
      (row) =>
        row.calculation === "minimum_total" &&
        typeof row.family_size === "number" &&
        typeof row.amount === "number" &&
        row.family_size < familySize,
    )
    .sort((left, right) => (right.family_size ?? 0) - (left.family_size ?? 0))[0];
  const increment = rows.find(
    (row) =>
      row.calculation === "increment_per_additional_member" &&
      row.family_size_above === base?.family_size &&
      typeof row.amount === "number",
  );
  if (
    !base ||
    !increment ||
    typeof base.amount !== "number" ||
    typeof increment.amount !== "number"
  ) {
    return undefined;
  }
  return {
    amount: base.amount + (familySize - (base.family_size ?? 0)) * increment.amount,
    currency: base.currency,
  };
}

function exemptionState(program: FilterIndexProgram, profile: UserProfile) {
  let uncertain = false;
  for (const exemption of program.criteria.proof_of_funds_exemptions) {
    const values = exemption.all_of.map((condition: ExemptionCondition) => profile[condition]);
    if (values.every((value) => value === true)) return "met" as const;
    if (values.some((value) => value === undefined)) uncertain = true;
  }
  return uncertain ? ("uncertain" as const) : ("not_met" as const);
}

export function evaluateProgram(
  program: FilterIndexProgram,
  profile: UserProfile,
  locale: Locale = defaultLocale,
): FilterResult {
  const reasons: FilterReason[] = [];
  const message = (key: UiKey, values: Record<string, string | number> = {}) =>
    tf(key, locale, values);
  const enumLabel = (value: string) => {
    if (locale === "en") return value.replaceAll("_", " ");
    return (
      {
        temporary_stay: "临时停留 / 灵活更换国家",
        renewable_residence: "可续签居留",
        permanent_residence: "永久居留",
        citizenship: "公民身份",
        employer_sponsored: "雇主担保",
        self_sponsored: "自助申请",
        own_company: "自有公司",
        points_invitation: "打分邀请",
        investment: "投资",
        remote_income: "境外远程收入",
        talent_pass: "人才准证",
        e_residency: "电子居民身份",
        secondary: "中学",
        vocational: "职业教育",
        associate: "副学士",
        bachelor: "学士",
        master: "硕士",
        doctorate: "博士",
        active: "开放",
        under_review: "待复核",
        paused: "暂停",
        closed: "关闭",
        annual: "每年",
        monthly: "每月",
        weekly: "每周",
      }[value] ?? value.replaceAll("_", " ")
    );
  };
  let blocking = false;
  let possible = false;
  let needsReview = false;
  let unknownPolicy = false;

  const add = (reason: Omit<FilterReason, "citations">) => {
    reasons.push({ ...reason, citations: citationsForField(program, reason.field) });
  };

  if (program.status !== "active") {
    needsReview = true;
    add({
      field: "program_status",
      severity: "warning",
      message: message("filter.reason.programStatus", { status: enumLabel(program.status) }),
    });
  }

  const settlementTrack = program.settlement_track ?? "unknown";
  if (
    (profile.goal === "permanent_residence" || profile.goal === "citizenship") &&
    (settlementTrack === "temporary_no_pr" || settlementTrack === "e_status_only")
  ) {
    blocking = true;
    add({
      field: "settlement_track",
      severity: "blocking",
      message: message(
        settlementTrack === "e_status_only" ? "filter.reason.eStatus" : "filter.reason.temporary",
      ),
    });
  }

  if (program.pathway_mechanism && program.pathway_mechanism !== "unknown") {
    add({
      field: "pathway_mechanism",
      severity: "positive",
      message: message("filter.reason.mechanism", {
        mechanism: enumLabel(program.pathway_mechanism),
      }),
    });
  }

  const temporaryGoalMatch =
    program.pathway_type === "temporary_only" ||
    program.pathway_type === "renewable_temporary" ||
    settlementTrack === "temporary_no_pr" ||
    settlementTrack === "temporary_may_lead_pr";
  if (profile.goal === "temporary_stay") {
    if (temporaryGoalMatch) {
      add({
        field: "goal",
        severity: "positive",
        message: message("filter.reason.goalTemporaryMatch"),
      });
    } else if (program.pathway_type === "unknown" && settlementTrack === "unknown") {
      unknownPolicy = true;
      add({
        field: "goal",
        severity: "unknown",
        message: message("filter.reason.goalTemporaryUnknown"),
      });
    } else {
      possible = true;
      add({
        field: "goal",
        severity: "warning",
        message: message("filter.reason.goalTemporaryCaveat"),
      });
    }
  }

  const pathwayValue =
    profile.goal === "citizenship" ? program.leads_to_citizenship : program.leads_to_pr;
  if (profile.goal === "permanent_residence" || profile.goal === "citizenship") {
    if (pathwayValue === false) {
      blocking = true;
      add({
        field: "goal",
        severity: "blocking",
        message: message("filter.reason.goalNo", { goal: enumLabel(profile.goal) }),
      });
    } else if (pathwayValue === "unknown") {
      unknownPolicy = true;
      add({
        field: "goal",
        severity: "unknown",
        message: message("filter.reason.goalUnknown"),
      });
    } else {
      add({
        field: "goal",
        severity: "positive",
        message: message(
          pathwayValue === "indirect" ? "filter.reason.goalIndirect" : "filter.reason.goalMatch",
        ),
      });
    }
  }

  const jobOfferRequired = program.criteria.job_offer_required ?? program.requires_job_offer;
  if (jobOfferRequired === true && profile.valid_job_offer === false) {
    blocking = true;
    add({
      field: "job_offer",
      severity: "blocking",
      message: message("filter.reason.jobNo"),
    });
  } else if (jobOfferRequired === true && profile.valid_job_offer === undefined) {
    possible = true;
    add({
      field: "job_offer",
      severity: "warning",
      message: message("filter.reason.jobMissing"),
    });
  }

  if (program.criteria.income_required === true) {
    const minIncome = program.criteria.min_income?.[0];
    if (!minIncome || typeof minIncome.amount !== "number") {
      unknownPolicy = true;
      add({
        field: "income",
        severity: "unknown",
        message: message("filter.reason.incomeUnknown"),
      });
    } else {
      // Profile income is not collected yet; keep the requirement visible.
      possible = true;
      add({
        field: "income",
        severity: "warning",
        message: message("filter.reason.incomeMissing", {
          amount: minIncome.amount,
          currency: minIncome.currency,
          period: minIncome.period ? ` (${enumLabel(minIncome.period)})` : "",
        }),
      });
    }
  }

  const minWorkYears = program.criteria.min_work_experience_years;
  if (typeof minWorkYears === "number") {
    if (profile.skilled_work_years === undefined) {
      possible = true;
      add({
        field: "work_experience",
        severity: "warning",
        message: message("filter.reason.workMissing", { minimum: minWorkYears }),
      });
    } else if (profile.skilled_work_years < minWorkYears) {
      blocking = true;
      add({
        field: "work_experience",
        severity: "blocking",
        message: message("filter.reason.workBelow", {
          actual: profile.skilled_work_years,
          minimum: minWorkYears,
        }),
      });
    } else {
      add({
        field: "work_experience",
        severity: "positive",
        message: message("filter.reason.workMet"),
      });
    }
  }

  if (program.requires_language_test === "unknown") {
    unknownPolicy = true;
    add({
      field: "language_test",
      severity: "unknown",
      message: message("filter.reason.languageUnknown"),
    });
  } else if (program.requires_language_test === true) {
    if (profile.has_approved_language_test === false) {
      blocking = true;
      add({
        field: "language_test",
        severity: "blocking",
        message: message("filter.reason.languageRequired"),
      });
    } else if (profile.has_approved_language_test === undefined) {
      possible = true;
      add({
        field: "language_test",
        severity: "warning",
        message: message("filter.reason.languageConfirm"),
      });
    }
  }

  const minBenchmark = program.criteria.min_language_benchmark;
  if (typeof minBenchmark === "number" && profile.has_approved_language_test === true) {
    if (profile.language_benchmark === undefined) {
      possible = true;
      add({
        field: "language_benchmark",
        severity: "warning",
        message: message("filter.reason.benchmarkMissing", { minimum: minBenchmark }),
      });
    } else if (profile.language_benchmark < minBenchmark) {
      blocking = true;
      add({
        field: "language_benchmark",
        severity: "blocking",
        message: message("filter.reason.benchmarkBelow", {
          actual: profile.language_benchmark,
          minimum: minBenchmark,
        }),
      });
    } else {
      add({
        field: "language_benchmark",
        severity: "positive",
        message: message("filter.reason.benchmarkMet"),
      });
    }
  }

  const minEducation = program.criteria.min_education_level;
  if (minEducation === "unknown") {
    unknownPolicy = true;
    add({
      field: "education",
      severity: "unknown",
      message: message("filter.reason.educationUnknown"),
    });
  } else if (minEducation) {
    if (!profile.education_level) {
      possible = true;
      add({
        field: "education",
        severity: "warning",
        message: message("filter.reason.educationMissing", {
          minimum: enumLabel(minEducation),
        }),
      });
    } else if (
      educationRank[profile.education_level] < educationRank[minEducation as EducationLevel]
    ) {
      blocking = true;
      add({
        field: "education",
        severity: "blocking",
        message: message("filter.reason.educationBelow", {
          minimum: enumLabel(minEducation),
        }),
      });
    } else {
      add({
        field: "education",
        severity: "positive",
        message: message("filter.reason.educationMet"),
      });
    }
  }

  const assessmentRequired = program.criteria.credential_assessment_required;
  const assessmentCondition = program.criteria.credential_assessment_condition;
  if (assessmentRequired === "unknown") {
    unknownPolicy = true;
    add({
      field: "credential_assessment",
      severity: "unknown",
      message: message("filter.reason.assessmentUnknown"),
    });
  } else if (assessmentCondition === "foreign_education" && profile.foreign_education === true) {
    if (profile.has_eca === false) {
      blocking = true;
      add({
        field: "credential_assessment",
        severity: "blocking",
        message: message("filter.reason.foreignAssessmentRequired"),
      });
    } else if (profile.has_eca === undefined) {
      possible = true;
      add({
        field: "credential_assessment",
        severity: "warning",
        message: message("filter.reason.foreignAssessmentConfirm"),
      });
    } else {
      add({
        field: "credential_assessment",
        severity: "positive",
        message: message("filter.reason.foreignAssessmentMet"),
      });
    }
  } else if (assessmentRequired === true) {
    if (profile.has_eca === false) {
      blocking = true;
      add({
        field: "credential_assessment",
        severity: "blocking",
        message: message("filter.reason.assessmentRequired"),
      });
    } else if (profile.has_eca === undefined) {
      possible = true;
      add({
        field: "credential_assessment",
        severity: "warning",
        message: message("filter.reason.assessmentConfirm"),
      });
    } else {
      add({
        field: "credential_assessment",
        severity: "positive",
        message: message("filter.reason.assessmentMet"),
      });
    }
  }

  const minProgramPoints = program.criteria.min_program_selection_points;
  if (minProgramPoints === "unknown") {
    unknownPolicy = true;
    add({
      field: "program_selection_points",
      severity: "unknown",
      message: message("filter.reason.pointsUnknown"),
    });
  } else if (typeof minProgramPoints === "number") {
    if (profile.program_selection_points === undefined) {
      // Points systems are competitive and opaque to first-time users; treat as
      // "possible" rather than burying the pathway under complex-review only.
      possible = true;
      add({
        field: "program_selection_points",
        severity: "warning",
        message: message("filter.reason.pointsMissing", { minimum: minProgramPoints }),
      });
    } else if (profile.program_selection_points < minProgramPoints) {
      blocking = true;
      add({
        field: "program_selection_points",
        severity: "blocking",
        message: message("filter.reason.pointsBelow", {
          actual: profile.program_selection_points,
          minimum: minProgramPoints,
        }),
      });
    } else {
      add({
        field: "program_selection_points",
        severity: "positive",
        message: message("filter.reason.pointsMet"),
      });
    }
  }

  const fundsExemption = exemptionState(program, profile);
  if (!program.criteria.proof_of_funds.length) {
    add({
      field: "settlement_funds",
      severity: "positive",
      message: message("filter.reason.noFundsTable"),
    });
  } else if (fundsExemption === "met") {
    add({
      field: "settlement_funds",
      severity: "positive",
      message: message("filter.reason.fundsExempt"),
    });
  } else if (profile.family_size === undefined || !profile.liquid_funds) {
    possible = true;
    add({
      field: "settlement_funds",
      severity: "warning",
      message: message("filter.reason.fundsMissing"),
    });
  } else {
    const required = requiredFunds(program, profile.family_size);
    if (!required) {
      unknownPolicy = true;
      add({
        field: "settlement_funds",
        severity: "unknown",
        message: message("filter.reason.fundsUnknown"),
      });
    } else if (profile.liquid_funds.currency !== required.currency) {
      needsReview = true;
      add({
        field: "settlement_funds",
        severity: "warning",
        message: message("filter.reason.fundsCurrency", { currency: required.currency }),
      });
    } else if (profile.liquid_funds.amount < required.amount) {
      if (fundsExemption === "uncertain") {
        possible = true;
        add({
          field: "settlement_funds",
          severity: "warning",
          message: message("filter.reason.fundsExemptionUnknown", {
            amount: required.amount,
            currency: required.currency,
          }),
        });
      } else {
        blocking = true;
        add({
          field: "settlement_funds",
          severity: "blocking",
          message: message("filter.reason.fundsBelow", {
            actual: profile.liquid_funds.amount,
            currency: required.currency,
            minimum: required.amount,
          }),
        });
      }
    } else {
      add({
        field: "settlement_funds",
        severity: "positive",
        message: message("filter.reason.fundsMet", {
          amount: required.amount,
          currency: required.currency,
        }),
      });
    }
  }

  if (program.freshness.needs_human_review) {
    // Soft caveat only: most bootstrap records are flagged for review, so elevating
    // status would hide almost every pathway from the shortlist.
    add({
      field: "content_review",
      severity: "warning",
      message: message("filter.reason.review"),
    });
  }

  const status: FilterResultStatus = blocking
    ? "not_match"
    : needsReview
      ? "needs_review"
      : unknownPolicy
        ? "unknown"
        : possible
          ? "possible_match"
          : "likely_match";
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        reasons.filter(({ severity }) => severity === "blocking").length * 100 -
        reasons.filter(({ severity }) => severity === "warning").length * 12 -
        reasons.filter(({ severity }) => severity === "unknown").length * 20,
    ),
  );

  return { program_id: program.program_id, status, score, reasons };
}

function isVisibleForGoal(program: FilterIndexProgram, profile: UserProfile) {
  if (profile.goal !== "temporary_stay") return true;
  return (
    !["direct_pr", "direct_citizenship", "e_status_only"].includes(program.pathway_type) &&
    !["direct_pr", "e_status_only"].includes(program.settlement_track)
  );
}

function isVisibleForCategory(program: FilterIndexProgram, profile: UserProfile) {
  const selected = profile.category_ids?.filter(Boolean) ?? [];
  if (!selected.length) return true;
  return program.category_ids.some((id) => selected.includes(id));
}

export function evaluatePrograms(
  programs: FilterIndexProgram[],
  profile: UserProfile,
  locale: Locale = defaultLocale,
): FilterResult[] {
  return programs
    .filter(
      (program) => isVisibleForGoal(program, profile) && isVisibleForCategory(program, profile),
    )
    .map((program) => evaluateProgram(program, profile, locale))
    .sort(
      (left, right) => right.score - left.score || left.program_id.localeCompare(right.program_id),
    );
}
