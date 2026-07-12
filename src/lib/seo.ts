import type { Locale } from "../i18n";
import type { CanonicalDataset } from "./data";

export const SITE_ORIGIN = "https://world-immigrant.com";

function normalizedPath(path: string) {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function absoluteUrl(path: string) {
  return new URL(normalizedPath(path), SITE_ORIGIN).href;
}

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export type SitemapEntry = {
  path: string;
  lastmod?: string;
};

export function renderSitemap(entries: SitemapEntry[]) {
  const urls = [...entries]
    .sort((a, b) => absoluteUrl(a.path).localeCompare(absoluteUrl(b.path)))
    .map(({ path, lastmod }) => {
      const modified = lastmod ? `\n    <lastmod>${escapeXml(lastmod.slice(0, 10))}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(absoluteUrl(path))}</loc>${modified}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function localizedRoutePairs(path: string): Array<{ locale: Locale; path: string }> {
  const canonicalPath = normalizedPath(path);
  return [
    { locale: "en", path: canonicalPath },
    {
      locale: "zh-Hans",
      path: canonicalPath === "/" ? "/zh-Hans/" : `/zh-Hans${canonicalPath}`,
    },
  ];
}

function latestCanonicalTimestamp(dataset: CanonicalDataset) {
  const timestamps = [
    ...dataset.countries.flatMap(({ freshness }) => [
      freshness.updated_at,
      freshness.last_checked_at,
    ]),
    ...dataset.programs.flatMap(({ freshness }) => [
      freshness.updated_at,
      freshness.last_checked_at,
    ]),
    ...dataset.sources.flatMap(({ last_checked_at, last_success_at }) =>
      [last_checked_at, last_success_at].filter((value): value is string => Boolean(value)),
    ),
  ];
  return new Date(Math.max(...timestamps.map((value) => Date.parse(value)))).toISOString();
}

export function buildSitemapEntries(dataset: CanonicalDataset): SitemapEntry[] {
  const globalLastmod = latestCanonicalTimestamp(dataset);
  const staticPaths = [
    "/",
    "/categories",
    "/countries",
    "/compare",
    "/filter",
    "/sources",
    "/methodology",
    "/glossary",
  ];
  const entries = staticPaths.flatMap((path) =>
    localizedRoutePairs(path).map(({ path: localizedPath }) => ({
      path: localizedPath,
      lastmod: globalLastmod,
    })),
  );

  for (const category of dataset.categories) {
    entries.push(
      ...localizedRoutePairs(`/categories/${category.id}`).map(({ path }) => ({
        path,
        lastmod: globalLastmod,
      })),
    );
  }
  for (const country of dataset.countries) {
    entries.push(
      ...localizedRoutePairs(`/countries/${country.id}`).map(({ path }) => ({
        path,
        lastmod: country.freshness.last_checked_at,
      })),
    );
  }
  for (const program of dataset.programs) {
    entries.push(
      ...localizedRoutePairs(`/programs/${program.id}`).map(({ path }) => ({
        path,
        lastmod: program.freshness.last_checked_at,
      })),
    );
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function webSiteJsonLd(locale: Locale, description: string) {
  return {
    "@type": "WebSite" as const,
    "@id": `${SITE_ORIGIN}/#website`,
    url: `${SITE_ORIGIN}/`,
    name: "World Immigrant",
    description,
    inLanguage: locale,
  };
}

type WebPageInput = {
  locale: Locale;
  path: string;
  name: string;
  description: string;
  dateModified?: string;
  type?: "WebPage" | "CollectionPage" | "AboutPage";
};

export function webPageJsonLd({
  locale,
  path,
  name,
  description,
  dateModified,
  type = "WebPage",
}: WebPageInput) {
  return {
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    ...(dateModified ? { dateModified } : {}),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map(({ name, path }, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
