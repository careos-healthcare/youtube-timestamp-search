import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { buildSearchPath, buildTopicPath, buildVideoPath } from "@/lib/seo";
import { normalizeText } from "@/lib/youtube";

export type InternalLink = {
  label: string;
  href: string;
};

export type InternalVideoLink = {
  videoId: string;
  title: string;
  href: string;
  detail?: string;
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

export function getRelatedTopicsForPhrase(phrase: string, limit = 8): string[] {
  const tokens = new Set(tokenize(phrase));
  const candidates = new Map<string, number>();

  for (const topic of TOPIC_SEEDS) {
    const topicTokens = tokenize(`${topic.slug} ${topic.displayName}`);
    const overlap = topicTokens.filter((token) => tokens.has(token)).length;
    if (overlap > 0) {
      candidates.set(topic.slug, overlap * 3 + (topic.featured ? 2 : 0));
    }
  }

  if (candidates.size < limit) {
    for (const topic of TOPIC_SEEDS.filter((entry) => entry.featured)) {
      if (!candidates.has(topic.slug)) {
        candidates.set(topic.slug, 1);
      }
    }
  }

  return [...candidates.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([slug]) => slug);
}

export function buildTopicLinks(slugs: string[]): InternalLink[] {
  return slugs.map((slug) => ({
    label: formatTopicLabel(slug),
    href: buildTopicPath(slug),
  }));
}

export function buildVideoLinks(
  videos: Array<{ videoId: string; title: string; matchCount?: number }>
): InternalVideoLink[] {
  return videos.map((video) => ({
    videoId: video.videoId,
    title: video.title,
    href: buildVideoPath(video.videoId),
    detail: video.matchCount != null ? `${video.matchCount} matches` : undefined,
  }));
}

export function buildInternalLinkGraph(input: {
  phrase: string;
  videoKeywords?: string[];
  topVideos?: Array<{ videoId: string; title: string; matchCount?: number }>;
}) {
  const relatedPhrases = getRelatedSearchPhrases(input.phrase, 10);
  const relatedTopics = getRelatedTopicsForPhrase(input.phrase, 8);
  const videoPhraseLinks =
    input.videoKeywords && input.videoKeywords.length > 0
      ? getRelatedPhrasesForVideo(input.videoKeywords, 8)
      : buildSearchLinks(relatedPhrases.slice(0, 8));

  return {
    relatedPhrases: buildSearchLinks(relatedPhrases),
    relatedTopics: buildTopicLinks(relatedTopics),
    relatedVideos: buildVideoLinks(input.topVideos ?? []),
    videoPhraseLinks,
  };
}
