import { getSearchLandingData, type SearchLandingData } from "@/lib/search-landing-engine";
import {
  buildSearchLinks,
  getRelatedSearchPhrases,
  getRelatedTopicsForPhrase,
} from "@/lib/internal-linking";
import { buildTopicContent } from "@/lib/topic-content";
import {
  formatTopicLabel,
  isTopicKeyword,
  normalizeTopicSlug,
} from "@/lib/topic-keywords";

export const AUTHORITY_TOPIC_SLUGS = [
  "artificial-intelligence",
  "startup",
  "python",
  "fitness",
  "relationships",
  "ai",
  "machine-learning",
  "podcast-interviews",
  "entrepreneurship",
] as const;

export type TopicClusterData = {
  slug: string;
  label: string;
  clusterLabel: string;
  intro: string;
  searchPhrase: string;
  landing: SearchLandingData;
  relatedTopics: Array<{ slug: string; label: string }>;
  relatedSearchLinks: ReturnType<typeof buildSearchLinks>;
};

function resolveSearchPhrase(slug: string, label: string) {
  if (slug === "artificial-intelligence") return "artificial intelligence";
  if (slug === "startup") return "startup advice";
  return label.toLowerCase();
}

export async function getTopicClusterData(rawSlug: string): Promise<TopicClusterData | null> {
  const slug = normalizeTopicSlug(rawSlug);
  if (!isTopicKeyword(slug)) {
    return null;
  }

  const content = buildTopicContent(slug);
  const searchPhrase = resolveSearchPhrase(slug, content.label);
  const landing = await getSearchLandingData(searchPhrase, 24);
  const relatedTopics = getRelatedTopicsForPhrase(searchPhrase, 8).map((relatedSlug) => ({
    slug: relatedSlug,
    label: formatTopicLabel(relatedSlug),
  }));

  const relatedSearchLinks = buildSearchLinks([
    ...new Set([...content.popularSearches, ...getRelatedSearchPhrases(searchPhrase, 10)]),
  ]).slice(0, 14);

  return {
    slug,
    label: content.label,
    clusterLabel: content.clusterLabel,
    intro: content.intro,
    searchPhrase,
    landing,
    relatedTopics,
    relatedSearchLinks,
  };
}

export function isAuthorityTopicSlug(slug: string) {
  return AUTHORITY_TOPIC_SLUGS.includes(slug as (typeof AUTHORITY_TOPIC_SLUGS)[number]);
}
