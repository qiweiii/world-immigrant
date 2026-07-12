import assert from "node:assert/strict";
import test from "node:test";
import { loadCanonicalData } from "../src/lib/data";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildSitemapEntries,
  escapeXml,
  localizedRoutePairs,
  renderSitemap,
  type SitemapEntry,
  serializeJsonLd,
  webPageJsonLd,
  webSiteJsonLd,
} from "../src/lib/seo";

test("SEO helpers build canonical absolute URLs", () => {
  assert.equal(absoluteUrl("/countries/canada"), "https://world-immigrant.com/countries/canada/");
  assert.equal(absoluteUrl("/"), "https://world-immigrant.com/");
});

test("SEO helpers escape XML and render deterministic sitemap entries", () => {
  assert.equal(escapeXml('a&b<"c">'), "a&amp;b&lt;&quot;c&quot;&gt;");
  const entries: SitemapEntry[] = [
    { path: "/programs/z", lastmod: "2026-07-12T10:00:00Z" },
    { path: "/", lastmod: "2026-07-11T10:00:00Z" },
  ];
  const xml = renderSitemap(entries);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.indexOf("https://world-immigrant.com/") < xml.indexOf("/programs/z/"));
  assert.match(xml, /<lastmod>2026-07-12<\/lastmod>/);
  assert.doesNotMatch(xml, /priority|changefreq/);
});

test("SEO helpers return English and Simplified Chinese route pairs", () => {
  assert.deepEqual(localizedRoutePairs("/countries/canada"), [
    { locale: "en", path: "/countries/canada/" },
    { locale: "zh-Hans", path: "/zh-Hans/countries/canada/" },
  ]);
});

test("SEO helpers enumerate all canonical localized routes with entity freshness", async () => {
  const dataset = await loadCanonicalData();
  const entries = buildSitemapEntries(dataset);
  const expected =
    16 + dataset.categories.length * 2 + dataset.countries.length * 2 + dataset.programs.length * 2;
  assert.equal(entries.length, expected);
  assert.equal(new Set(entries.map(({ path }) => path)).size, entries.length);
  const canada = dataset.countries.find(({ id }) => id === "canada");
  assert.ok(canada);
  assert.deepEqual(
    entries.find(({ path }) => path === "/countries/canada/"),
    { path: "/countries/canada/", lastmod: canada.freshness.last_checked_at },
  );
  assert.ok(entries.some(({ path }) => path === "/zh-Hans/methodology/"));
  assert.ok(entries.some(({ path }) => path === "/glossary/"));
});

test("SEO helpers create localized WebSite and WebPage JSON-LD", () => {
  const site = webSiteJsonLd("zh-Hans", "附有来源引用的全球移民路径对比。");
  assert.equal(site["@type"], "WebSite");
  assert.equal(site.inLanguage, "zh-Hans");
  const page = webPageJsonLd({
    locale: "en",
    path: "/countries/canada",
    name: "Canada immigration pathways — World Immigrant",
    description: "Canadian immigration pathways with official sources.",
    dateModified: "2026-07-12T10:00:00Z",
  });
  assert.equal(page.url, "https://world-immigrant.com/countries/canada/");
  assert.equal(page.dateModified, "2026-07-12T10:00:00Z");
  assert.deepEqual(page.isPartOf, { "@id": "https://world-immigrant.com/#website" });
});

test("SEO helpers create ordered breadcrumb JSON-LD", () => {
  const value = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Canada", path: "/countries/canada" },
  ]);
  assert.equal(value["@type"], "BreadcrumbList");
  assert.deepEqual(
    value.itemListElement.map((item) => item.position),
    [1, 2],
  );
  assert.equal(value.itemListElement[1]?.item, "https://world-immigrant.com/countries/canada/");
});

test("SEO helpers serialize JSON-LD without allowing a closing script tag", () => {
  const serialized = serializeJsonLd({ description: "safe </script><script>alert(1)</script>" });
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.deepEqual(JSON.parse(serialized), {
    description: "safe </script><script>alert(1)</script>",
  });
});
