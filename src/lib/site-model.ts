import type { CanonicalDataset } from "./data";

export function buildCountryPageModels(dataset: CanonicalDataset) {
  const programsById = new Map(dataset.programs.map((program) => [program.id, program]));
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));

  return dataset.countries.map((country) => ({
    country,
    programs: country.program_ids.flatMap((id) => {
      const program = programsById.get(id);
      return program ? [program] : [];
    }),
    categories: country.categories.flatMap((id) => {
      const category = categoriesById.get(id);
      return category ? [category] : [];
    }),
  }));
}

export function buildProgramPageModels(dataset: CanonicalDataset) {
  const countriesById = new Map(dataset.countries.map((country) => [country.id, country]));
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));
  const sourcesById = new Map(dataset.sources.map((source) => [source.id, source]));

  return dataset.programs.flatMap((program) => {
    const country = countriesById.get(program.country_id);
    if (!country) return [];

    return [
      {
        program,
        country,
        categories: program.category_ids.flatMap((id) => {
          const category = categoriesById.get(id);
          return category ? [category] : [];
        }),
        sources: program.source_ids.flatMap((id) => {
          const source = sourcesById.get(id);
          return source ? [source] : [];
        }),
        citations: Object.entries(program.field_citations).map(([path, citations]) => ({
          path,
          citations,
        })),
      },
    ];
  });
}

export type CountryPageModel = ReturnType<typeof buildCountryPageModels>[number];
export type ProgramPageModel = ReturnType<typeof buildProgramPageModels>[number];
