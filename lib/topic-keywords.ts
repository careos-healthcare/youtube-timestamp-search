import { TOPIC_SEEDS } from "@/lib/topic-seeds";

export type TopicCluster =
  | "youtube-transcript-search"
  | "podcasts"
  | "creator-business"
  | "productivity"
  | "health-fitness"
  | "psychology"
  | "ai-software"
  | "money-investing"
  | "education-lecture"
  | "popular-creator";

export type TopicSeed = {
  slug: string;
  displayName: string;
  cluster: TopicCluster;
  description: string;
  featured?: boolean;
};

export type TopicRecord = TopicSeed & {
  relatedTopics: string[];
  searchPhrases: string[];
};

export const TOPIC_CLUSTER_LABELS: Record<TopicCluster, string> = {
  "youtube-transcript-search": "YouTube transcript search",
  podcasts: "Podcasts",
  "creator-business": "Creator & business",
  productivity: "Productivity",
  "health-fitness": "Health & fitness",
  psychology: "Psychology",
  "ai-software": "AI & software",
  "money-investing": "Money & investing",
  "education-lecture": "Education & lectures",
  "popular-creator": "Popular creators & shows",
};

export const TOPIC_CLUSTER_ORDER: TopicCluster[] = [
  "youtube-transcript-search",
  "podcasts",
  "creator-business",
  "productivity",
  "health-fitness",
  "psychology",
  "ai-software",
  "money-investing",
  "education-lecture",
  "popular-creator",
];

const CLUSTER_SEARCH_PHRASE_TEMPLATES: Record<TopicCluster, string[]> = {
  "youtube-transcript-search": [
    "{name} transcript search",
    "find {slug} in youtube video",
    "{name} timestamp",
    "search {slug} captions",
    "{name} quote finder",
  ],
  podcasts: [
    "{name} podcast transcript",
    "{name} podcast clip",
    "find {slug} in podcast",
    "{name} interview moment",
    "{name} episode highlight",
  ],
  "creator-business": [
    "{name} interview advice",
    "{name} startup clip",
    "{name} business strategy",
    "search {slug} in interview",
    "{name} founder quote",
  ],
  productivity: [
    "{name} productivity tips",
    "{name} routine advice",
    "find {slug} in lecture",
    "{name} habit framework",
    "{name} focus techniques",
  ],
  "health-fitness": [
    "{name} podcast discussion",
    "{name} health lecture",
    "find {slug} in wellness video",
    "{name} evidence talk",
    "{name} protocol explanation",
  ],
  psychology: [
    "{name} psychology lecture",
    "{name} mindset talk",
    "find {slug} in interview",
    "{name} coping strategies",
    "{name} neuroscience clip",
  ],
  "ai-software": [
    "{name} tutorial transcript",
    "{name} coding walkthrough",
    "find {slug} in course video",
    "{name} debugging explanation",
    "{name} lecture notes",
  ],
  "money-investing": [
    "{name} investing advice",
    "{name} finance interview",
    "find {slug} in market commentary",
    "{name} wealth strategy",
    "{name} portfolio talk",
  ],
  "education-lecture": [
    "{name} lecture transcript",
    "{name} course module",
    "find {slug} in class video",
    "{name} study explanation",
    "{name} exam topic",
  ],
  "popular-creator": [
    "{name} best quotes",
    "{name} interview clip",
    "find moment in {name}",
    "{name} podcast timestamp",
    "{name} highlight search",
  ],
};

function applyTemplate(template: string, topic: TopicSeed) {
  return template
    .replaceAll("{name}", topic.displayName)
    .replaceAll("{slug}", topic.slug.replace(/-/g, " "));
}

function buildSearchPhrases(topic: TopicSeed): string[] {
  return CLUSTER_SEARCH_PHRASE_TEMPLATES[topic.cluster].map((template) =>
    applyTemplate(template, topic)
  );
}

function buildRelatedTopics(topic: TopicSeed, allTopics: TopicRecord[]): string[] {
  const sameCluster = allTopics
    .filter((candidate) => candidate.slug !== topic.slug && candidate.cluster === topic.cluster)
    .map((candidate) => candidate.slug);

  const featured = allTopics
    .filter((candidate) => candidate.slug !== topic.slug && candidate.featured)
    .map((candidate) => candidate.slug);

  const merged = [...sameCluster, ...featured];
  const unique: string[] = [];

  for (const slug of merged) {
    if (!unique.includes(slug)) {
      unique.push(slug);
    }
    if (unique.length >= 8) {
      break;
    }
  }

  return unique;
}

function buildTopicDatabase(seeds: TopicSeed[]): TopicRecord[] {
  const base = seeds.map((seed) => ({
    ...seed,
    relatedTopics: [] as string[],
    searchPhrases: buildSearchPhrases(seed),
  }));

  return base.map((topic) => ({
    ...topic,
    relatedTopics: buildRelatedTopics(topic, base),
  }));
}

export const TOPIC_DATABASE: TopicRecord[] = buildTopicDatabase(TOPIC_SEEDS);

export const TOPIC_BY_SLUG = new Map(TOPIC_DATABASE.map((topic) => [topic.slug, topic]));

export const TOPIC_KEYWORDS = TOPIC_DATABASE.map((topic) => topic.slug);

export type TopicKeyword = (typeof TOPIC_KEYWORDS)[number];

export function normalizeTopicSlug(keyword: string) {
  return decodeURIComponent(keyword).toLowerCase();
}

export function getTopicBySlug(keyword: string): TopicRecord | undefined {
  return TOPIC_BY_SLUG.get(normalizeTopicSlug(keyword));
}

export function isTopicKeyword(keyword: string): keyword is TopicKeyword {
  return TOPIC_BY_SLUG.has(normalizeTopicSlug(keyword));
}

export function formatTopicLabel(keyword: string) {
  return getTopicBySlug(keyword)?.displayName ?? keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export function getRelatedTopics(keyword: string, limit = 6) {
  const topic = getTopicBySlug(keyword);
  if (!topic) {
    return TOPIC_KEYWORDS.slice(0, limit);
  }

  return topic.relatedTopics.slice(0, limit);
}

export function getTopicsByCluster(cluster: TopicCluster) {
  return TOPIC_DATABASE.filter((topic) => topic.cluster === cluster);
}

export function getFeaturedTopics(limit = 28) {
  return TOPIC_DATABASE.filter((topic) => topic.featured).slice(0, limit);
}

export function getFeaturedTopicsByCluster(limitPerCluster = 3) {
  return TOPIC_CLUSTER_ORDER.map((cluster) => ({
    cluster,
    label: TOPIC_CLUSTER_LABELS[cluster],
    topics: TOPIC_DATABASE.filter((topic) => topic.cluster === cluster && topic.featured).slice(
      0,
      limitPerCluster
    ),
  })).filter((group) => group.topics.length > 0);
}

export function getTopicsGroupedByCluster() {
  return TOPIC_CLUSTER_ORDER.map((cluster) => ({
    cluster,
    label: TOPIC_CLUSTER_LABELS[cluster],
    topics: getTopicsByCluster(cluster),
  }));
}
