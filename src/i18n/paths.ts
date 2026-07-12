import { defaultLocale, isLocale, type Locale, locales } from "./locales";

/** Remove a leading supported locale segment from a pathname. */
export function stripLocalePrefix(pathname: string): string {
  const raw = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = raw.split("/");
  // ["", "zh-Hans", "countries", ...] or ["", "countries"]
  if (segments.length > 1 && isLocale(segments[1]) && segments[1] !== defaultLocale) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return raw === "" ? "/" : raw;
}

/** Read locale from a pathname. Unprefixed paths are English. */
export function localeFromPath(pathname: string): Locale {
  const segments = (pathname.startsWith("/") ? pathname : `/${pathname}`).split("/");
  if (segments.length > 1 && isLocale(segments[1]) && segments[1] !== defaultLocale) {
    return segments[1];
  }
  return defaultLocale;
}

/**
 * Build a locale-aware path. English stays unprefixed; other locales use /{locale}/...
 * Preserves query string if present on the input path.
 */
export function withLocale(path: string, locale: Locale): string {
  const [pathPart, query = ""] = path.split("?");
  const bare = stripLocalePrefix(pathPart || "/");
  const normalized = bare === "" ? "/" : bare;
  let localized: string;
  if (locale === defaultLocale) {
    localized = normalized;
  } else if (normalized === "/") {
    localized = `/${locale}/`;
  } else {
    localized = `/${locale}${normalized}`;
  }
  return query ? `${localized}?${query}` : localized;
}

/** Map of alternate URLs for every supported locale (same bare path). */
export function alternateLocalePaths(pathname: string): Record<Locale, string> {
  const bare = stripLocalePrefix(pathname);
  return Object.fromEntries(locales.map((locale) => [locale, withLocale(bare, locale)])) as Record<
    Locale,
    string
  >;
}
