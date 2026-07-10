import { z } from "zod";

export const localizedTextSchema = z.record(z.string(), z.string().min(1));

export const categorySchema = z.object({
  id: z.string().min(1),
  names: localizedTextSchema,
  description: localizedTextSchema,
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  publisher: z.string().min(1),
  source_type: z.enum([
    "official",
    "law",
    "government_pdf",
    "embassy",
    "official_calculator",
    "reputable_secondary",
  ]),
  language: z.string().min(2),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  update_frequency_days: z.number().int().positive(),
  extraction_method: z.enum(["web_extract", "browser", "pdf", "manual"]),
  status: z.enum(["active", "broken", "needs_attention", "deprecated"]),
});

export const countrySchema = z.object({
  id: z.string().min(1),
  iso2: z.string().length(2),
  iso3: z.string().length(3),
  names: localizedTextSchema,
  region: z.string().min(1),
  summary: localizedTextSchema,
  categories: z.array(z.string()),
  program_ids: z.array(z.string()),
});

export const programSchema = z.object({
  id: z.string().min(1),
  country_id: z.string().min(1),
  category_ids: z.array(z.string()).min(1),
  official_names: localizedTextSchema,
  status: z.enum(["active", "paused", "closed", "unknown"]),
  summary: localizedTextSchema,
  source_ids: z.array(z.string()),
  filter: z.object({
    pathway_type: z.enum([
      "temporary_only",
      "renewable_temporary",
      "residence",
      "direct_pr",
      "direct_citizenship",
      "unknown",
    ]),
    leads_to_pr: z.union([z.boolean(), z.literal("indirect"), z.literal("unknown")]),
    leads_to_citizenship: z.union([z.boolean(), z.literal("indirect"), z.literal("unknown")]),
    source_confidence_score: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    last_checked_at: z.string().datetime(),
  }),
});

export type Category = z.infer<typeof categorySchema>;
export type Country = z.infer<typeof countrySchema>;
export type Program = z.infer<typeof programSchema>;
export type Source = z.infer<typeof sourceSchema>;
