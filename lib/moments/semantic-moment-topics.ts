import type { IndexedVideo } from "@/lib/indexed-videos";
import { normalizeText } from "@/lib/youtube";

import { CREATOR_DATABASE } from "@/lib/creator-data";
import type { SemanticExtractionKind } from "@/lib/moments/semantic-extractor";

export type SemanticTopicLabeling = {
  primaryTopic: string;
  secondaryTopics: string[];
  topicCategory?: string;
  relatedConcepts: string[];
  creatorTopicLinks: {
    creatorSlug?: string;
    relatedTopicSlugs: string[];
  };
  /** Soft slug for future `/topic/[slug]` clustering (not a route contract yet). */
  topicClusterHint?: string;
};

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "what",
  "when",
  "where",
  "your",
  "about",
  "into",
  "have",
  "been",
  "will",
  "would",
  "could",
  "should",
]);

function slugHint(label: string) {
  return normalizeText(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function topKeywords(text: string, limit: number) {
  const words = normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((w) => w.length >= 4 && !STOP.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function matchCreatorSlug(channelName?: string) {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return undefined;
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) return c.slug;
    if (c.aliases.some((a) => a.toLowerCase() === ch)) return c.slug;
    if (ch.includes(c.displayName.toLowerCase())) return c.slug;
  }
  return undefined;
}

export function labelSemanticMomentTopics(params: {
  phrase: string;
  snippet: string;
  extractionKinds: SemanticExtractionKind[];
  indexed?: IndexedVideo | null;
}): SemanticTopicLabeling {
  const phraseKeywords = topKeywords(params.phrase, 8);
  const snippetKeywords = topKeywords(params.snippet, 14);
  const relatedConcepts = [...new Set([...phraseKeywords, ...snippetKeywords])].filter(
    (w) => !phraseKeywords.slice(0, 2).includes(w)
  ).slice(0, 12);

  const primaryFromIndex = params.indexed?.topic?.trim();
  const primaryTopic =
    primaryFromIndex ||
    (phraseKeywords[0] ? phraseKeywords[0]!.replace(/^./, (c) => c.toUpperCase()) : "General");

  const secondary = new Set<string>();
  if (params.indexed?.relatedTopics) {
    for (const t of params.indexed.relatedTopics) {
      if (t.label) secondary.add(t.label);
    }
  }
  for (const k of phraseKeywords.slice(1, 5)) {
    secondary.add(k.replace(/^./, (c) => c.toUpperCase()));
  }
  if (secondary.has(primaryTopic)) secondary.delete(primaryTopic);

  const relatedTopicSlugs = (params.indexed?.relatedTopics ?? []).map((t) => t.slug).slice(0, 10);

  const topicClusterHint = slugHint(primaryTopic);

  return {
    primaryTopic,
    secondaryTopics: [...secondary].slice(0, 8),
    topicCategory: params.indexed?.category,
    relatedConcepts,
    creatorTopicLinks: {
      creatorSlug: matchCreatorSlug(params.indexed?.channelName),
      relatedTopicSlugs,
    },
    topicClusterHint,
  };
}
