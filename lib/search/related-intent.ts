import { getRelatedSearchPhrases } from "@/lib/internal-linking";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { buildSearchPath } from "@/lib/seo";
import { normalizeText } from "@/lib/youtube";

export type RelatedIntentGroup = {
  label: string;
  phrases: Array<{ phrase: string; href: string; score: number }>;
};

function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

async function loadAnalyticsRelatedQueries(phrase: string, limit: number) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [] as Array<{ phrase: string; score: number }>;

  const tokens = new Set(tokenize(phrase));
  const { data, error } = await supabase
    .from("search_analytics_events")
    .select("query")
    .not("query", "is", null)
    .in("event_name", [
      "search_query",
      "homepage_search",
      "search_submitted",
      "indexed_transcript_search",
    ])
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const query = row.query?.trim().toLowerCase();
    if (!query || query === phrase.toLowerCase()) continue;

    const overlap = tokenize(query).filter((token) => tokens.has(token)).length;
    if (overlap === 0) continue;

    counts.set(query, (counts.get(query) ?? 0) + overlap + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([relatedPhrase, score]) => ({ phrase: relatedPhrase, score }));
}

export async function getPeopleAlsoSearched(phrase: string, limit = 12) {
  const corpusRelated = getRelatedSearchPhrases(phrase, limit);
  const analyticsRelated = await loadAnalyticsRelatedQueries(phrase, limit);
  const merged = new Map<string, number>();

  for (const [index, related] of corpusRelated.entries()) {
    merged.set(related.toLowerCase(), (limit - index) * 2);
  }

  for (const related of analyticsRelated) {
    const key = related.phrase.toLowerCase();
    merged.set(key, (merged.get(key) ?? 0) + related.score * 3);
  }

  return [...merged.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([relatedPhrase, score]) => ({
      phrase: relatedPhrase,
      href: buildSearchPath(relatedPhrase),
      score,
    }));
}

export function getRelatedIntentGroups(phrase: string): RelatedIntentGroup[] {
  const tokens = new Set(tokenize(phrase));
  const topicGroup: RelatedIntentGroup = { label: "Related topics", phrases: [] };
  const seedGroup: RelatedIntentGroup = { label: "Popular searches", phrases: [] };
  const creatorGroup: RelatedIntentGroup = { label: "Creator angles", phrases: [] };

  for (const topic of TOPIC_SEEDS) {
    const overlap = tokenize(`${topic.slug} ${topic.displayName}`).filter((token) =>
      tokens.has(token)
    ).length;
    if (overlap > 0) {
      topicGroup.phrases.push({
        phrase: topic.displayName.toLowerCase(),
        href: buildSearchPath(topic.displayName),
        score: overlap,
      });
    }
  }

  for (const seed of PRIORITY_SEARCH_QUERIES) {
    if (seed.phrase.toLowerCase() === phrase.toLowerCase()) continue;
    const overlap = tokenize(seed.phrase).filter((token) => tokens.has(token)).length;
    if (overlap > 0) {
      seedGroup.phrases.push({
        phrase: seed.phrase,
        href: buildSearchPath(seed.phrase),
        score: overlap,
      });
    }
  }

  for (const seed of PRIORITY_SEARCH_QUERIES.slice(0, 12)) {
    if (seed.phrase.toLowerCase() === phrase.toLowerCase()) continue;
    creatorGroup.phrases.push({
      phrase: seed.phrase,
      href: buildSearchPath(seed.phrase),
      score: 1,
    });
  }

  return [topicGroup, seedGroup, creatorGroup]
    .map((group) => ({
      ...group,
      phrases: group.phrases
        .sort((left, right) => right.score - left.score)
        .slice(0, 6),
    }))
    .filter((group) => group.phrases.length > 0);
}
