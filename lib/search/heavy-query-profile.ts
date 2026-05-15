import { slugifyQuery } from "@/lib/seo";

export type QueryComplexity = "broad" | "normal";

/** Normalized phrases that are intentionally broad and expensive on hybrid + semantic paths. */
const BROAD_PHRASES = new Set(
  [
    "ai agents",
    "system design",
    "startup",
    "startup advice",
    "programming language",
    "machine learning",
    "deep learning",
    "software engineering",
  ].map((s) => s.toLowerCase())
);

const BROAD_SLUGS = new Set(
  ["ai-agents", "system-design", "startup", "startup-advice", "programming-language"].map((s) => s.toLowerCase())
);

export function getQueryComplexity(phrase: string): QueryComplexity {
  const trimmed = phrase.trim().toLowerCase();
  if (!trimmed) return "normal";
  if (BROAD_PHRASES.has(trimmed)) return "broad";
  const slug = slugifyQuery(trimmed);
  if (BROAD_SLUGS.has(slug)) return "broad";
  return "normal";
}

/** Tighter caps for broad queries (moments, hybrid slice, keyword fetch ceiling). */
export function getBroadQueryCaps() {
  return {
    momentLimit: 10,
    hybridResultLimit: 12,
    keywordFetchCeiling: 22,
    peopleAlsoLimit: 0,
    /** Fewer transcript metadata fetches on broad queries. */
    enrichVideoCap: 5,
  } as const;
}
