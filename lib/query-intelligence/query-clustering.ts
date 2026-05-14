import { TOPIC_SEEDS } from "@/lib/topic-seeds";

import { normalizeQueryPhrase, tokenizeQuery } from "@/lib/query-intelligence/query-normalizer";

export type QueryCluster = {
  id: string;
  label: string;
  topicSlug?: string;
  phrases: string[];
  demand: number;
};

function clusterKeyForTokens(tokens: string[]) {
  return tokens.slice(0, 3).sort().join("-") || "general";
}

export function clusterQueries(
  entries: Array<{ phrase: string; demand: number }>
): QueryCluster[] {
  const clusters = new Map<string, QueryCluster>();

  for (const entry of entries) {
    const tokens = tokenizeQuery(entry.phrase);
    let assigned = false;

    for (const topic of TOPIC_SEEDS) {
      const topicTokens = tokenizeQuery(`${topic.slug} ${topic.displayName}`);
      const overlap = tokens.filter((token) => topicTokens.includes(token)).length;
      if (overlap > 0) {
        const id = `topic:${topic.slug}`;
        const existing = clusters.get(id);
        if (existing) {
          existing.phrases.push(entry.phrase);
          existing.demand += entry.demand;
        } else {
          clusters.set(id, {
            id,
            label: topic.displayName,
            topicSlug: topic.slug,
            phrases: [entry.phrase],
            demand: entry.demand,
          });
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      const id = `token:${clusterKeyForTokens(tokens)}`;
      const label = tokens.slice(0, 2).join(" ") || normalizeQueryPhrase(entry.phrase);
      const existing = clusters.get(id);
      if (existing) {
        existing.phrases.push(entry.phrase);
        existing.demand += entry.demand;
      } else {
        clusters.set(id, {
          id,
          label,
          phrases: [entry.phrase],
          demand: entry.demand,
        });
      }
    }
  }

  return [...clusters.values()].sort((left, right) => right.demand - left.demand);
}

export function clustersNeedingDepth(clusters: QueryCluster[], minPhraseCount = 4) {
  return clusters.filter((cluster) => cluster.phrases.length >= minPhraseCount);
}
