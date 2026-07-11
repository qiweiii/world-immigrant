import type { Locale } from "./locales";
import { defaultLocale } from "./locales";

/** LocalizedText / LocalizedMarkdown shape from the data model. */
export type LocalizedValue = { en: string } & Record<string, string>;

/**
 * Pick the best available string for a locale.
 * Prefer exact locale, then English, then any remaining value.
 */
export function pickLocalized(
  value: LocalizedValue | string | undefined | null,
  locale: Locale,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value[locale]) return value[locale];
  if (value[defaultLocale]) return value[defaultLocale];
  const first = Object.values(value).find((entry) => typeof entry === "string" && entry.length > 0);
  return first ?? "";
}
