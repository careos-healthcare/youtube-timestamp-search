import { contentTokens } from "@/lib/query-quality/stopword-filter";

export type CoOccurrenceEdge = {
  left: string;
  right: string;
  count: number;
};

export function buildCoOccurrenceMap(snippets: string[], windowSize = 6) {
  const counts = new Map<string, number>();

  for (const snippet of snippets) {
    const tokens = contentTokens(snippet).slice(0, windowSize);
    for (let index = 0; index < tokens.length; index += 1) {
      for (let inner = index + 1; inner < tokens.length; inner += 1) {
        const left = tokens[index];
        const right = tokens[inner];
        const key = left < right ? `${left}::${right}` : `${right}::${left}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const [left, right] = key.split("::");
      return { left, right, count };
    })
    .sort((a, b) => b.count - a.count);
}

export function topCoOccurrences(snippets: string[], limit = 50) {
  return buildCoOccurrenceMap(snippets).slice(0, limit);
}
