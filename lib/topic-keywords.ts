export const TOPIC_KEYWORDS = [
  "dopamine",
  "focus",
  "discipline",
  "startup",
  "productivity",
  "ai",
  "money",
  "fitness",
  "motivation",
  "business",
  "habits",
  "psychology",
  "learning",
  "podcasts",
  "quotes",
  "success",
  "health",
  "marketing",
  "coding",
  "entrepreneurship",
] as const;

export type TopicKeyword = (typeof TOPIC_KEYWORDS)[number];

export function isTopicKeyword(keyword: string): keyword is TopicKeyword {
  return TOPIC_KEYWORDS.includes(keyword as TopicKeyword);
}

export function formatTopicLabel(keyword: string) {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export function getRelatedTopics(keyword: string, limit = 6) {
  const index = TOPIC_KEYWORDS.indexOf(keyword as TopicKeyword);
  if (index === -1) {
    return TOPIC_KEYWORDS.slice(0, limit);
  }

  const rotated = [
    ...TOPIC_KEYWORDS.slice(index + 1),
    ...TOPIC_KEYWORDS.slice(0, index),
  ];

  return rotated.slice(0, limit);
}

export const FEATURED_TOPIC_KEYWORDS: TopicKeyword[] = [
  "dopamine",
  "focus",
  "discipline",
  "startup",
  "productivity",
  "ai",
  "podcasts",
  "quotes",
];
