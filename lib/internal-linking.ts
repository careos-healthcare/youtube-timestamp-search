import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { buildSearchPath } from "@/lib/seo";
import { normalizeText } from "@/lib/youtube";

export type InternalLink = {
  label: string;
  href: string;
};

function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

export function getRelatedSearchPhrases(phrase: string, limit = 10): string[] {
  const tokens = new Set(tokenize(phrase));
  const candidates = new Map<string, number>();

  for (const seed of PRIORITY_SEARCH_QUERIES) {
    if (seed.phrase.toLowerCase() === phrase.toLowerCase()) continue;
    const seedTokens = tokenize(seed.phrase);
    const overlap = seedTokens.filter((t) => tokens.has(t)).length;
    if (overlap > 0) {
      candidates.set(seed.phrase, overlap * 3);
    }
  }

  for (const topic of TOPIC_SEEDS) {
    if (topic.displayName.toLowerCase() === phrase.toLowerCase()) continue;
    const topicTokens = tokenize(`${topic.slug} ${topic.displayName}`);
    const overlap = topicTokens.filter((t) => tokens.has(t)).length;
    if (overlap > 0) {
      candidates.set(topic.displayName.toLowerCase(), overlap * 2);
    }
  }

  if (candidates.size < limit) {
    for (const seed of PRIORITY_SEARCH_QUERIES) {
      if (!candidates.has(seed.phrase) && seed.phrase.toLowerCase() !== phrase.toLowerCase()) {
        candidates.set(seed.phrase, 1);
      }
      if (candidates.size >= limit + 5) break;
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

export function buildSearchLinks(phrases: string[]): InternalLink[] {
  return phrases.map((phrase) => ({
    label: phrase,
    href: buildSearchPath(phrase),
  }));
}

export function getRelatedPhrasesForVideo(keywords: string[], limit = 8): InternalLink[] {
  const merged = new Set<string>();
  for (const keyword of keywords) {
    for (const related of getRelatedSearchPhrases(keyword, 4)) {
      merged.add(related);
    }
  }
  return buildSearchLinks([...merged].slice(0, limit));
}
