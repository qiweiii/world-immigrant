import { createHash } from "node:crypto";
import type { Source } from "./schema";

export type ContentChangeState = "first_seen" | "unchanged" | "content_changed";

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

export function normalizeSourceText(content: string, contentType: string) {
  let text = content.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (contentType.toLowerCase().includes("html")) {
    text = text
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(address|article|aside|blockquote|div|h[1-6]|li|main|p|section|table|td|th|tr)>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " ");
    text = decodeHtmlEntities(text);
  }

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .normalize("NFKC");
}

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizedIncludesQuote(normalizedSource: string, quote: string) {
  const compact = (value: string) =>
    value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  return compact(normalizedSource).includes(compact(quote));
}

export function classifyContentChange(
  previousNormalizedHash: string | undefined,
  currentNormalizedHash: string,
): ContentChangeState {
  if (!previousNormalizedHash) return "first_seen";
  return previousNormalizedHash === currentNormalizedHash ? "unchanged" : "content_changed";
}

export function sourceRunRequiresReview(result: string, expectedHintMisses: string[] = []) {
  return (
    ["content_changed", "fetch_failed", "domain_rejected", "extraction_required"].includes(
      result,
    ) || expectedHintMisses.length > 0
  );
}

export function selectDueSources(sources: Source[], now: Date, limit: number) {
  return sources
    .filter((source) => {
      if (source.status !== "active") return false;
      const baseline = source.last_success_at ?? source.last_checked_at;
      if (!baseline) return true;
      const dueAt = new Date(baseline).getTime() + source.update_frequency_days * 86_400_000;
      return dueAt <= now.getTime();
    })
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
    .slice(0, Math.max(0, limit));
}
