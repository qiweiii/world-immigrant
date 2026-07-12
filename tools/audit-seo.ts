import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const dist = join(root, "dist");
const origin = "https://world-immigrant.com";
const errors: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function matches(content: string, pattern: RegExp) {
  return [...content.matchAll(pattern)];
}

function attribute(content: string, pattern: RegExp) {
  return matches(content, pattern)[0]?.[1] ?? "";
}

function builtPath(file: string) {
  const path = relative(dist, file).replaceAll("\\", "/");
  if (path === "index.html") return "/";
  return `/${path.replace(/index\.html$/, "")}`;
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

if (!existsSync(dist)) {
  throw new Error("dist does not exist. Run pnpm build before pnpm seo:audit.");
}

const htmlFiles = walk(dist).filter((file) => file.endsWith(".html"));
const pages = new Map<
  string,
  { file: string; title: string; language: string; alternates: Map<string, string> }
>();
const titles = new Map<string, string>();

for (const file of htmlFiles) {
  const content = readFileSync(file, "utf8");
  const path = builtPath(file);
  const titleMatches = matches(content, /<title>(.*?)<\/title>/gis);
  const descriptionMatches = matches(
    content,
    /<meta\s+name="description"\s+content="([^"]*)"[^>]*>/gis,
  );
  const canonicalMatches = matches(content, /<link\s+rel="canonical"\s+href="([^"]*)"[^>]*>/gis);
  const h1Matches = matches(content, /<h1(?:\s[^>]*)?>/gis);
  const canonical = canonicalMatches[0]?.[1] ?? "";
  const title = titleMatches[0]?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
  const language = attribute(content, /<html\s+lang="([^"]+)"/gi);

  if (titleMatches.length !== 1)
    errors.push(`${path}: expected one title, found ${titleMatches.length}`);
  if (descriptionMatches.length !== 1 || !descriptionMatches[0]?.[1]?.trim()) {
    errors.push(`${path}: expected one non-empty meta description`);
  }
  if (canonicalMatches.length !== 1) {
    errors.push(`${path}: expected one canonical, found ${canonicalMatches.length}`);
  }
  if (h1Matches.length !== 1) errors.push(`${path}: expected one H1, found ${h1Matches.length}`);
  if (canonical !== `${origin}${path}`) {
    errors.push(`${path}: canonical ${canonical || "missing"} does not match built route`);
  }
  if (titles.has(title)) errors.push(`${path}: duplicate title also used by ${titles.get(title)}`);
  else titles.set(title, path);

  const alternateMatches = matches(
    content,
    /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"[^>]*>/gis,
  );
  const alternates = new Map(alternateMatches.map((match) => [match[1] ?? "", match[2] ?? ""]));
  for (const required of ["en", "zh-Hans", "x-default"]) {
    if (!alternates.has(required)) errors.push(`${path}: missing hreflang ${required}`);
  }

  const jsonLdMatches = matches(
    content,
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
  );
  if (jsonLdMatches.length !== 1) {
    errors.push(`${path}: expected one JSON-LD block, found ${jsonLdMatches.length}`);
  } else {
    try {
      const parsed = JSON.parse(jsonLdMatches[0]?.[1] ?? "");
      const graph = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
      const page = graph.find((item: Record<string, unknown>) =>
        ["WebPage", "CollectionPage", "AboutPage"].includes(String(item?.["@type"])),
      );
      if (page?.url !== canonical)
        errors.push(`${path}: JSON-LD page URL does not match canonical`);
      if (page?.inLanguage !== language)
        errors.push(`${path}: JSON-LD language does not match html lang`);
    } catch (error) {
      errors.push(
        `${path}: invalid JSON-LD (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  const ogImage = attribute(content, /<meta\s+property="og:image"\s+content="([^"]+)"[^>]*>/gi);
  if (ogImage !== `${origin}/og.png`) errors.push(`${path}: unexpected or missing og:image`);
  if (!content.includes(`href="${language === "zh-Hans" ? "/zh-Hans" : ""}/methodology"`)) {
    errors.push(`${path}: missing localized methodology footer link`);
  }
  if (!content.includes(`href="${language === "zh-Hans" ? "/zh-Hans" : ""}/glossary"`)) {
    errors.push(`${path}: missing localized glossary footer link`);
  }

  pages.set(canonical, { file, title, language, alternates });
}

for (const [canonical, page] of pages) {
  for (const language of ["en", "zh-Hans"]) {
    const alternate = page.alternates.get(language);
    const other = alternate ? pages.get(alternate) : undefined;
    if (!other)
      errors.push(`${canonical}: hreflang ${language} does not resolve to a built canonical page`);
    else if (![...other.alternates.values()].includes(canonical)) {
      errors.push(`${canonical}: hreflang ${language} lacks a reciprocal link`);
    }
  }
}

const sitemapPath = join(dist, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  errors.push("sitemap.xml is missing");
} else {
  const sitemap = readFileSync(sitemapPath, "utf8");
  const locations = matches(sitemap, /<loc>(.*?)<\/loc>/gis).map((match) =>
    decodeXml(match[1] ?? ""),
  );
  const locationSet = new Set(locations);
  if (locations.length !== locationSet.size) errors.push("sitemap.xml contains duplicate URLs");
  for (const canonical of pages.keys()) {
    if (!locationSet.has(canonical)) errors.push(`sitemap.xml is missing ${canonical}`);
  }
  for (const location of locationSet) {
    if (!pages.has(location))
      errors.push(`sitemap.xml contains non-HTML or non-canonical URL ${location}`);
  }
}

const robotsPath = join(dist, "robots.txt");
if (!existsSync(robotsPath)) errors.push("robots.txt is missing");
else if (!readFileSync(robotsPath, "utf8").includes(`Sitemap: ${origin}/sitemap.xml`)) {
  errors.push("robots.txt does not reference the canonical sitemap");
}
if (!existsSync(join(dist, "og.png"))) errors.push("og.png is missing from built output");

if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`SEO audit passed for ${pages.size} HTML pages and ${pages.size} sitemap URLs.`);
}
