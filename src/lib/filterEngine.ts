import type { buildPublicData } from "./public-data";

export type FilterResultStatus =
  | "likely_match"
  | "possible_match"
  | "not_match"
  | "needs_review"
  | "unknown";

export type FilterReason = {
  field: string;
  severity: "positive" | "warning" | "blocking" | "unknown";
  message: string;
  citations: string[];
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

function citationIds(program: FilterIndexProgram): string[] {
  return [
    ...new Set(
      Object.values(program.field_citations)
        .flat()
        .map(({ source_id }) => source_id),
    ),
  ];
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

export function evaluateProgram(program: FilterIndexProgram, profile: UserProfile): FilterResult {
  const citations = citationIds(program);
  const reasons: FilterReason[] = [];
  let blocking = false;
  let possible = false;
  let needsReview = false;
  let unknownPolicy = false;

  const add = (reason: Omit<FilterReason, "citations">) => {
    reasons.push({ ...reason, citations });
  };

  const pathwayValue =
    profile.goal === "citizenship" ? program.leads_to_citizenship : program.leads_to_pr;
  if (profile.goal === "permanent_residence" || profile.goal === "citizenship") {
    if (pathwayValue === false) {
      blocking = true;
      add({
        field: "goal",
        severity: "blocking",
        message: `This program does not lead to the requested ${profile.goal.replaceAll("_", " ")} outcome.`,
      });
    } else if (pathwayValue === "unknown") {
      unknownPolicy = true;
      add({
        field: "goal",
        severity: "unknown",
        message: "The pathway outcome is unknown in the current official evidence.",
      });
    } else {
      add({
        field: "goal",
        severity: "positive",
        message:
          pathwayValue === "indirect"
            ? "The requested outcome is available through a separate later pathway."
            : "The program matches the requested pathway outcome.",
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
        message: `Add skilled-work experience to check the ${minWorkYears}-year minimum.`,
      });
    } else if (profile.skilled_work_years < minWorkYears) {
      blocking = true;
      add({
        field: "work_experience",
        severity: "blocking",
        message: `The profile has ${profile.skilled_work_years} qualifying years; the minimum is ${minWorkYears}.`,
      });
    } else {
      add({
        field: "work_experience",
        severity: "positive",
        message: "The stated skilled-work duration meets the program minimum.",
      });
    }
  }

  if (program.requires_language_test === true) {
    if (profile.has_approved_language_test === false) {
      blocking = true;
      add({
        field: "language_test",
        severity: "blocking",
        message: "An approved language test is required.",
      });
    } else if (profile.has_approved_language_test === undefined) {
      possible = true;
      add({
        field: "language_test",
        severity: "warning",
        message: "Confirm whether the profile has a valid approved language test.",
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
        message: `Add the language benchmark to check the level ${minBenchmark} minimum.`,
      });
    } else if (profile.language_benchmark < minBenchmark) {
      blocking = true;
      add({
        field: "language_benchmark",
        severity: "blocking",
        message: `The stated benchmark is ${profile.language_benchmark}; the minimum is ${minBenchmark}.`,
      });
    } else {
      add({
        field: "language_benchmark",
        severity: "positive",
        message: "The stated language benchmark meets the program minimum.",
      });
    }
  }

  const minEducation = program.criteria.min_education_level;
  if (minEducation && minEducation !== "unknown") {
    if (!profile.education_level) {
      possible = true;
      add({
        field: "education",
        severity: "warning",
        message: `Add education to check the ${minEducation} minimum.`,
      });
    } else if (educationRank[profile.education_level] < educationRank[minEducation]) {
      blocking = true;
      add({
        field: "education",
        severity: "blocking",
        message: `The stated education is below the ${minEducation} minimum.`,
      });
    } else {
      add({
        field: "education",
        severity: "positive",
        message: "The stated education level meets the program minimum.",
      });
    }
  }

  if (
    program.criteria.credential_assessment_condition === "foreign_education" &&
    profile.foreign_education === true
  ) {
    if (profile.has_eca === false) {
      blocking = true;
      add({
        field: "credential_assessment",
        severity: "blocking",
        message: "Foreign education requires a valid immigration-purpose credential assessment.",
      });
    } else if (profile.has_eca === undefined) {
      possible = true;
      add({
        field: "credential_assessment",
        severity: "warning",
        message: "Confirm the foreign credential assessment.",
      });
    } else {
      add({
        field: "credential_assessment",
        severity: "positive",
        message: "The profile confirms a foreign credential assessment.",
      });
    }
  }

  const minProgramPoints = program.criteria.min_program_selection_points;
  if (typeof minProgramPoints === "number") {
    if (profile.program_selection_points === undefined) {
      needsReview = true;
      add({
        field: "program_selection_points",
        severity: "warning",
        message: `Calculate the program-specific score; the minimum is ${minProgramPoints}.`,
      });
    } else if (profile.program_selection_points < minProgramPoints) {
      blocking = true;
      add({
        field: "program_selection_points",
        severity: "blocking",
        message: `The stated program score is ${profile.program_selection_points}; the minimum is ${minProgramPoints}.`,
      });
    } else {
      add({
        field: "program_selection_points",
        severity: "positive",
        message: "The stated program-specific score meets the minimum.",
      });
    }
  }

  const fundsExemption = exemptionState(program, profile);
  if (fundsExemption === "met") {
    add({
      field: "settlement_funds",
      severity: "positive",
      message:
        "The profile states that all documented proof-of-funds exemption conditions are met.",
    });
  } else if (profile.family_size === undefined || !profile.liquid_funds) {
    possible = true;
    add({
      field: "settlement_funds",
      severity: "warning",
      message: "Add family size and liquid funds to check the current settlement-fund table.",
    });
  } else {
    const required = requiredFunds(program, profile.family_size);
    if (!required) {
      unknownPolicy = true;
      add({
        field: "settlement_funds",
        severity: "unknown",
        message: "The current data cannot calculate settlement funds for this family size.",
      });
    } else if (profile.liquid_funds.currency !== required.currency) {
      needsReview = true;
      add({
        field: "settlement_funds",
        severity: "warning",
        message: `Convert the profile funds to ${required.currency} using a current rate before comparing.`,
      });
    } else if (profile.liquid_funds.amount < required.amount) {
      if (fundsExemption === "uncertain") {
        possible = true;
        add({
          field: "settlement_funds",
          severity: "warning",
          message: `Funds are below ${required.amount} ${required.currency}, but exemption details are incomplete.`,
        });
      } else {
        blocking = true;
        add({
          field: "settlement_funds",
          severity: "blocking",
          message: `The profile states ${profile.liquid_funds.amount} ${required.currency}; the current minimum is ${required.amount}.`,
        });
      }
    } else {
      add({
        field: "settlement_funds",
        severity: "positive",
        message: `The stated funds meet the current ${required.amount} ${required.currency} minimum for this family size.`,
      });
    }
  }

  if (program.freshness.needs_human_review) {
    needsReview = true;
    add({
      field: "content_review",
      severity: "warning",
      message: "The underlying program record is flagged for human review.",
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

export function evaluatePrograms(
  programs: FilterIndexProgram[],
  profile: UserProfile,
): FilterResult[] {
  return programs
    .map((program) => evaluateProgram(program, profile))
    .sort(
      (left, right) => right.score - left.score || left.program_id.localeCompare(right.program_id),
    );
}
