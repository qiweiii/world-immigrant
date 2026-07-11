/** Supported UI/content locales. English is default and lives at unprefixed paths. */
export const defaultLocale = "en" as const;

export const locales = ["en", "zh-Hans"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  "zh-Hans": { native: "简体中文", english: "Simplified Chinese" },
};

/** BCP 47 / HTML lang values */
export const localeHtmlLang: Record<Locale, string> = {
  en: "en",
  "zh-Hans": "zh-Hans",
};

export const nonDefaultLocales = locales.filter(
  (locale): locale is Exclude<Locale, typeof defaultLocale> => locale !== defaultLocale,
);

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

/** Map browser language tags to a supported locale, or null if unsupported. */
export function matchBrowserLocale(languageTag: string): Locale | null {
  const normalized = languageTag.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return null;
  if (normalized === "zh-hans" || normalized === "zh-cn" || normalized === "zh-sg") return "zh-Hans";
  if (normalized === "zh-hant" || normalized === "zh-tw" || normalized === "zh-hk") return null;
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-Hans";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

export const LOCALE_STORAGE_KEY = "wi-locale";
