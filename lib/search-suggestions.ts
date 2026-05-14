import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { normalizeText } from "@/lib/youtube";

const STATIC_SUGGESTIONS = PRIORITY_SEARCH_QUERIES.map((q) => q.phrase);

const TOPIC_SUGGESTIONS = TOPIC_SEEDS.filter((t) => t.featured).map((t) =>
  t.displayName.toLowerCase()
);

const ALL_SUGGESTIONS = [...new Set([...STATIC_SUGGESTIONS, ...TOPIC_SUGGESTIONS])].sort();

export function getSearchSuggestions(prefix: string, limit = 8): string[] {
  const normalized = normalizeText(prefix).toLowerCase();
  if (!normalized) {
    return ALL_SUGGESTIONS.slice(0, limit);
  }

  return ALL_SUGGESTIONS.filter((suggestion) => suggestion.includes(normalized)).slice(0, limit);
}

export function getAllSearchSuggestionPhrases() {
  return ALL_SUGGESTIONS;
}
