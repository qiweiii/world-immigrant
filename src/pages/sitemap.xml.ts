import type { APIRoute } from "astro";
import { loadCanonicalData } from "../lib/data";
import { buildSitemapEntries, renderSitemap } from "../lib/seo";

export const GET: APIRoute = async () => {
  const dataset = await loadCanonicalData();
  return new Response(renderSitemap(buildSitemapEntries(dataset)), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
