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

export function classifyPlaceholderProfile(): FilterResult[] {
  return [
    {
      program_id: "mvp-data-needed",
      status: "needs_review",
      score: 0,
      reasons: [
        {
          field: "source_data",
          severity: "unknown",
          message: "Add official-source program data before eligibility matching is enabled.",
          citations: [],
        },
      ],
    },
  ];
}
