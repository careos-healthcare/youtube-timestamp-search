import { normalizeText } from "@/lib/youtube";

import { GENERIC_MOMENT_TOKENS } from "@/lib/moments/public-moment-quality";

import type { TopicPillar } from "@/lib/topics/topic-hub-types";

const RESERVED = new Set([
  "topics",
  "topic",
  "search",
  "video",
  "moment",
  "creator",
  "creators",
  "categories",
  "latest",
  "saved",
  "trending",
  "stats",
  "admin",
  "api",
  "unknown",
  "general",
]);

/** Decode + normalize incoming `[keyword]` param to compare with hub slugs. */
export function normalizeIncomingTopicSlug(raw: string) {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function slugifyTopicLabel(label: string) {
  const s = normalizeText(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s.length > 0 ? s : "topic";
}

export function isWeakTopicSlug(slug: string, displayLabel: string) {
  const s = slug.trim().toLowerCase();
  if (!s || s.length < 3 || RESERVED.has(s)) return true;
  const words = s.split("-").filter(Boolean);
  if (words.length === 1 && (words[0]!.length < 5 || GENERIC_MOMENT_TOKENS.has(words[0]!))) {
    return true;
  }
  const labelWords = normalizeText(displayLabel)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (labelWords.length === 1 && GENERIC_MOMENT_TOKENS.has(labelWords[0]!)) return true;
  return false;
}

export function inferTopicPillar(input: { slug: string; displayTitle: string; categorySlug?: string }): TopicPillar {
  const t = `${input.slug} ${input.displayTitle} ${input.categorySlug ?? ""}`.toLowerCase();
  if (
    /(^|-)(ai|ml|llm|agent|model|data|vector|embedding|rag|neural|gpu|inference|training)($|-)/.test(t) ||
    /\bai-podcasts\b/.test(t)
  ) {
    return "ai";
  }
  if (
    /program|code|javascript|python|react|typescript|kubernetes|docker|software|\bapi\b|debug|stack|database/.test(t) ||
    /programming-tutorials/.test(t)
  ) {
    return "coding";
  }
  if (
    /startup|founder|business|growth|fund|venture|\byc\b|gtm|marketing|customer|sales|revenue/.test(t) ||
    /business-interviews/.test(t)
  ) {
    return "startups";
  }
  if (/productivity|habit|routine|focus|time|deep work|calendar/.test(t) || /self-improvement/.test(t)) {
    return "productivity";
  }
  if (/learn|course|lecture|education|exam|study|teach|school|university/.test(t) || /finance-education/.test(t)) {
    return "education";
  }
  return "other";
}
