import type { ZodType } from "zod";
import type { CanonicalDataset } from "./data";
import { categorySchema, countrySchema, type Program, programSchema, sourceSchema } from "./schema";

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type ValidationOptions = {
  now?: Date;
  strictFreshness?: boolean;
};

export type FreshnessOptions = {
  now?: Date;
  strict?: boolean;
};

type DatasetInput = {
  categories: unknown[];
  countries: unknown[];
  programs: unknown[];
  sources: unknown[];
};

const MATERIAL_ROOTS = [
  "/status",
  "/summary_md",
  "/good_for_md",
  "/not_good_for_md",
  "/eligibility",
  "/funds",
  "/income",
  "/timeline",
  "/rights",
  "/family",
  "/pr_pathway",
  "/citizenship_pathway",
  "/filter",
] as const;

const NON_POLICY_PATHS = new Set([
  "/filter/last_checked_at",
  "/filter/policy_stability_score",
  "/filter/source_confidence_score",
]);

function parseEntities<T>(
  values: unknown[],
  schema: ZodType<T>,
  label: string,
  errors: string[],
): T[] {
  const parsed: T[] = [];
  for (const [index, value] of values.entries()) {
    const result = schema.safeParse(value);
    if (result.success) parsed.push(result.data);
    else {
      const details = result.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
      errors.push(`${label}[${index}] is invalid: ${details}`);
    }
  }
  return parsed;
}

function duplicateErrors(ids: string[], label: string): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
  return errors;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function collectScalarPointers(value: unknown, pointer: string, output: string[]): void {
  if (value === undefined) return;
  if (value === null || typeof value !== "object") {
    if (!NON_POLICY_PATHS.has(pointer)) output.push(pointer);
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectScalarPointers(item, `${pointer}/${index}`, output);
    }
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    collectScalarPointers(item, `${pointer}/${escapePointerSegment(key)}`, output);
  }
}

export function resolveJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  if (!pointer.startsWith("/")) return undefined;

  let current: unknown = value;
  for (const rawSegment of pointer.slice(1).split("/")) {
    const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function validateProgramCitations(
  program: Program,
  sourceById: Map<string, CanonicalDataset["sources"][number]>,
): string[] {
  const errors: string[] = [];
  const citationPointers = Object.keys(program.field_citations);

  for (const pointer of citationPointers) {
    if (resolveJsonPointer(program, pointer) === undefined) {
      errors.push(`Program ${program.id} citation pointer does not resolve: ${pointer}`);
    }

    for (const citation of program.field_citations[pointer]) {
      const source = sourceById.get(citation.source_id);
      if (!source) {
        errors.push(
          `Program ${program.id} citation references missing source ${citation.source_id}`,
        );
        continue;
      }
      if (!program.source_ids.includes(citation.source_id)) {
        errors.push(
          `Program ${program.id} citation source ${citation.source_id} is absent from source_ids`,
        );
      }
      if (citation.url !== source.url) {
        errors.push(
          `Program ${program.id} citation URL ${citation.url} does not match source ${source.id}`,
        );
      }
      if (!citation.quote_md && !citation.section) {
        errors.push(
          `Program ${program.id} citation at ${pointer} needs a quote_md or section locator`,
        );
      }
    }
  }

  for (const root of MATERIAL_ROOTS) {
    const rootValue = resolveJsonPointer(program, root);
    if (rootValue === undefined) continue;
    const scalarPointers: string[] = [];
    collectScalarPointers(rootValue, root, scalarPointers);
    for (const scalarPointer of scalarPointers) {
      const covered = citationPointers.some(
        (citationPointer) =>
          scalarPointer === citationPointer || scalarPointer.startsWith(`${citationPointer}/`),
      );
      if (!covered) {
        errors.push(`Program ${program.id} material field lacks citation: ${scalarPointer}`);
      }
    }
  }

  return errors;
}

function overdueMessage(id: string, lastCheckedAt: string, frequencyDays: number, now: Date) {
  const ageMs = now.getTime() - Date.parse(lastCheckedAt);
  const allowedMs = frequencyDays * 24 * 60 * 60 * 1000;
  if (ageMs <= allowedMs) return undefined;
  return `${id} is overdue: last checked ${lastCheckedAt}, frequency ${frequencyDays} days`;
}

function chronologyErrors(
  label: string,
  timestamps: Array<{ name: string; value?: string }>,
  now: Date,
): string[] {
  const errors: string[] = [];
  let previousMs = Number.NEGATIVE_INFINITY;
  for (const { name, value } of timestamps) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isFinite(ms)) {
      errors.push(`${label} has invalid ${name}`);
      continue;
    }
    if (ms > now.getTime() + 60_000) {
      errors.push(`${label} ${name} is in the future`);
    }
    if (ms + 1 < previousMs) {
      errors.push(`${label} timestamps are out of order around ${name}`);
    }
    previousMs = Math.max(previousMs, ms);
  }
  return errors;
}

export function evaluateFreshness(
  dataset: CanonicalDataset,
  options: FreshnessOptions = {},
): ValidationResult {
  const now = options.now ?? new Date();
  const issues: string[] = [];

  for (const country of dataset.countries) {
    const message = overdueMessage(
      `Country ${country.id}`,
      country.freshness.last_checked_at,
      country.freshness.update_frequency_days,
      now,
    );
    if (message) issues.push(message);
  }
  for (const program of dataset.programs) {
    const message = overdueMessage(
      `Program ${program.id}`,
      program.freshness.last_checked_at,
      program.freshness.update_frequency_days,
      now,
    );
    if (message) issues.push(message);
  }
  for (const source of dataset.sources) {
    if (source.status !== "active" || !source.last_checked_at) continue;
    const message = overdueMessage(
      `Source ${source.id}`,
      source.last_checked_at,
      source.update_frequency_days,
      now,
    );
    if (message) issues.push(message);
  }

  return options.strict ? { errors: issues, warnings: [] } : { errors: [], warnings: issues };
}

export function validateDataset(
  input: DatasetInput,
  options: ValidationOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dataset: CanonicalDataset = {
    categories: parseEntities(input.categories, categorySchema, "categories", errors),
    countries: parseEntities(input.countries, countrySchema, "countries", errors),
    programs: parseEntities(input.programs, programSchema, "programs", errors),
    sources: parseEntities(input.sources, sourceSchema, "sources", errors),
  };

  errors.push(
    ...duplicateErrors(
      dataset.categories.map(({ id }) => id),
      "category",
    ),
    ...duplicateErrors(
      dataset.countries.map(({ id }) => id),
      "country",
    ),
    ...duplicateErrors(
      dataset.programs.map(({ id }) => id),
      "program",
    ),
    ...duplicateErrors(
      dataset.sources.map(({ id }) => id),
      "source",
    ),
  );

  const categoryIds = new Set(dataset.categories.map(({ id }) => id));
  const countryById = new Map(dataset.countries.map((country) => [country.id, country]));
  const programById = new Map(dataset.programs.map((program) => [program.id, program]));
  const sourceById = new Map(dataset.sources.map((source) => [source.id, source]));

  for (const country of dataset.countries) {
    errors.push(
      ...chronologyErrors(
        `Country ${country.id}`,
        [
          { name: "created_at", value: country.freshness.created_at },
          { name: "updated_at", value: country.freshness.updated_at },
          { name: "last_checked_at", value: country.freshness.last_checked_at },
          { name: "last_changed_at", value: country.freshness.last_changed_at },
        ],
        options.now ?? new Date(),
      ),
    );
    for (const categoryId of country.categories) {
      if (!categoryIds.has(categoryId)) {
        errors.push(`Country ${country.id} references missing category ${categoryId}`);
      }
    }
    for (const programId of country.program_ids) {
      const program = programById.get(programId);
      if (!program) errors.push(`Country ${country.id} references missing program ${programId}`);
      else if (program.country_id !== country.id) {
        errors.push(
          `Country ${country.id} references program ${programId} owned by ${program.country_id}`,
        );
      }
    }
    for (const sourceId of country.official_source_ids) {
      const source = sourceById.get(sourceId);
      if (!source) errors.push(`Country ${country.id} references missing source ${sourceId}`);
      else if (source.country_id !== country.id) {
        errors.push(
          `Country ${country.id} references source ${sourceId} owned by ${source.country_id}`,
        );
      }
    }
  }

  for (const source of dataset.sources) {
    if (!countryById.has(source.country_id)) {
      errors.push(`Source ${source.id} references missing country ${source.country_id}`);
    }
    if (source.status === "active" && !source.last_checked_at) {
      errors.push(`Active source ${source.id} requires last_checked_at`);
    }
    if (source.status === "active" && !source.last_success_at) {
      errors.push(`Active source ${source.id} requires last_success_at`);
    }
    errors.push(
      ...chronologyErrors(
        `Source ${source.id}`,
        [
          { name: "last_success_at", value: source.last_success_at },
          { name: "last_checked_at", value: source.last_checked_at },
        ],
        options.now ?? new Date(),
      ),
    );
    for (const programId of source.program_ids) {
      const program = programById.get(programId);
      if (!program) errors.push(`Source ${source.id} references missing program ${programId}`);
      else if (program.country_id !== source.country_id) {
        errors.push(
          `Source ${source.id} country ${source.country_id} conflicts with program ${programId}`,
        );
      }
    }
  }

  for (const program of dataset.programs) {
    const country = countryById.get(program.country_id);
    if (!country) {
      errors.push(`Program ${program.id} references missing country ${program.country_id}`);
    } else if (!country.program_ids.includes(program.id)) {
      errors.push(`Program ${program.id} is absent from country ${country.id} program_ids`);
    }

    for (const categoryId of program.category_ids) {
      if (!categoryIds.has(categoryId)) {
        errors.push(`Program ${program.id} references missing category ${categoryId}`);
      }
      if (country && !country.categories.includes(categoryId)) {
        errors.push(
          `Program ${program.id} category ${categoryId} is absent from country ${country.id}`,
        );
      }
    }
    errors.push(
      ...chronologyErrors(
        `Program ${program.id}`,
        [
          { name: "created_at", value: program.freshness.created_at },
          { name: "updated_at", value: program.freshness.updated_at },
          { name: "last_checked_at", value: program.freshness.last_checked_at },
          { name: "last_changed_at", value: program.freshness.last_changed_at },
        ],
        options.now ?? new Date(),
      ),
    );
    for (const sourceId of program.source_ids) {
      const source = sourceById.get(sourceId);
      if (!source) errors.push(`Program ${program.id} references missing source ${sourceId}`);
      else if (!source.program_ids.includes(program.id)) {
        errors.push(`Program ${program.id} is absent from source ${sourceId} program_ids`);
      }
    }
    if (program.status === "active") {
      errors.push(...validateProgramCitations(program, sourceById));
    }
  }

  const freshness = evaluateFreshness(dataset, {
    now: options.now,
    strict: options.strictFreshness,
  });
  errors.push(...freshness.errors);
  warnings.push(...freshness.warnings);

  return { errors, warnings };
}
