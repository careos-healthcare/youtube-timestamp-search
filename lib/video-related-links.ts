import { getCreatorsForTopic } from "@/lib/creator-data";
import { getFeaturedTopics, getTopicBySlug } from "@/lib/topic-keywords";

export function getRelatedTopicsForKeywords(keywords: string[], limit = 6) {
  const featured = getFeaturedTopics(limit);
  const matched = keywords
    .map((keyword) => getTopicBySlug(keyword))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const merged = [...matched, ...featured];
  const unique: typeof matched = [];

  for (const topic of merged) {
    if (!unique.some((entry) => entry.slug === topic.slug)) {
      unique.push(topic);
    }
    if (unique.length >= limit) break;
  }

  return unique;
}

export function getRelatedCreatorsForKeywords(keywords: string[], limit = 6) {
  const creators = keywords.flatMap((keyword) => getCreatorsForTopic(keyword, 2));
  const unique = new Map(creators.map((creator) => [creator.slug, creator]));
  return [...unique.values()].slice(0, limit);
}
