import { getRelatedSearchPhrases } from "@/lib/internal-linking";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";

export type RecoveryPath = "exact" | "normalized" | "expansion" | "related_topic" | "trending_seed";

const MAX_ATTEMPTS = 14;

/** Broad / high-value synonym buckets (consumer search, not enterprise). */
const QUERY_SYNONYMS: Record<string, string[]> = {
  "ai agents": [
    "agentic ai",
    "autonomous agents",
    "tool use",
    "function calling",
    "langchain",
    "openai agents",
  ],
  rag: [
    "retrieval augmented generation",
    "vector search",
    "embeddings",
    "semantic search",
  ],
  "system design": ["architecture", "scaling", "databases", "caching", "distributed systems"],
  "startup advice": [
    "yc startup school",
    "product market fit",
    "fundraising",
    "growth",
  ],
  mcp: ["model context protocol", "tools", "agents", "context protocol"],
};

export function normalizeForSearch(query: string): string {
  return query
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bucketKeyForQuery(normalizedLower: string): string | null {
  for (const key of Object.keys(QUERY_SYNONYMS)) {
    if (normalizedLower === key) return key;
    if (key.includes(" ")) {
      if (normalizedLower.includes(key)) return key;
      continue;
    }
    const boundary = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`, "i");
    if (boundary.test(normalizedLower)) return key;
  }
  return null;
}

export function getSynonymExpansions(query: string): string[] {
  const n = normalizeForSearch(query).toLowerCase();
  const key = bucketKeyForQuery(n);
  if (!key) return [];
  return QUERY_SYNONYMS[key] ?? [];
}

export function getTrendingSeedQueries(limit = 10): string[] {
  return PRIORITY_SEARCH_QUERIES.slice(0, limit).map((s) => s.phrase);
}

export function getRelatedTopicQueries(phrase: string, limit = 8): string[] {
  return getRelatedSearchPhrases(phrase, limit);
}

export type RecoveryAttempt = { query: string; path: RecoveryPath };

/**
 * Ordered fallback attempts: exact → normalized → expansions → related topics → trending seeds.
 */
export function getRecoveryQueryAttempts(userQuery: string): RecoveryAttempt[] {
  const trimmed = userQuery.trim();
  const out: RecoveryAttempt[] = [];
  const seen = new Set<string>();

  const push = (q: string, path: RecoveryPath) => {
    const key = q.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ query: q, path });
  };

  push(trimmed, "exact");

  const normalized = normalizeForSearch(trimmed);
  if (normalized.toLowerCase() !== trimmed.toLowerCase()) {
    push(normalized, "normalized");
  }

  for (const term of getSynonymExpansions(trimmed)) {
    push(term, "expansion");
  }

  for (const term of getRelatedTopicQueries(trimmed, 8)) {
    push(term, "related_topic");
  }

  for (const term of getTrendingSeedQueries(12)) {
    push(term, "trending_seed");
  }

  return out.slice(0, MAX_ATTEMPTS);
}

/** UI chips: synonym expansions + related phrases (deduped). */
export function getContinueExploringPhrases(phrase: string, limit = 14): string[] {
  const merged = new Set<string>();
  const base = normalizeForSearch(phrase).toLowerCase();
  for (const t of getSynonymExpansions(phrase)) merged.add(t);
  for (const t of getRelatedTopicQueries(phrase, 10)) merged.add(t);
  merged.delete(base);
  return [...merged].slice(0, limit);
}
