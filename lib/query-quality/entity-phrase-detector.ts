import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { contentTokens, tokenizeAllWords } from "@/lib/query-quality/stopword-filter";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";

const KNOWN_ENTITIES = new Set([
  "kubernetes",
  "docker",
  "react",
  "typescript",
  "javascript",
  "python",
  "graphql",
  "nextjs",
  "openai",
  "anthropic",
  "tensorflow",
  "pytorch",
  "langchain",
  "supabase",
  "vercel",
  "stripe",
  "huberman",
  "rogan",
  "lex",
  "fridman",
  "combinator",
  "saas",
  "startup",
  "fundraising",
  "dopamine",
  "neuroscience",
  "machine",
  "learning",
  "transformers",
  "rag",
  "llm",
  "llms",
  "mcp",
  "agents",
]);

const ENTITY_PATTERN =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[a-z]+(?:\s+[a-z]+){1,3}\s+(school|lab|university|institute|framework|protocol|database|platform|api))\b/;

export type EntityDetection = {
  hasEntity: boolean;
  entityScore: number;
  matchedEntities: string[];
  creatorMatches: string[];
  topicMatches: string[];
};

export function detectEntities(phrase: string): EntityDetection {
  const normalized = phrase.toLowerCase();
  const tokens = tokenizeAllWords(normalized);
  const content = contentTokens(normalized);
  const matchedEntities = new Set<string>();

  for (const token of [...tokens, ...content]) {
    if (KNOWN_ENTITIES.has(token)) matchedEntities.add(token);
  }

  for (const topic of TOPIC_SEEDS) {
    const topicTokens = `${topic.slug} ${topic.displayName}`.toLowerCase().split(/[^a-z0-9]+/);
    const overlap = content.filter((token) => topicTokens.includes(token)).length;
    if (overlap >= 2 || (overlap >= 1 && content.length <= 2)) {
      matchedEntities.add(topic.displayName.toLowerCase());
    }
  }

  const creatorMatches = CREATOR_SEEDS.filter(
    (creator) =>
      normalized.includes(creator.displayName.toLowerCase()) ||
      normalized.includes(creator.slug.replace(/-/g, " "))
  ).map((creator) => creator.displayName);

  for (const creator of creatorMatches) {
    matchedEntities.add(creator.toLowerCase());
  }

  if (ENTITY_PATTERN.test(phrase)) {
    matchedEntities.add(normalized);
  }

  const topicMatches = TOPIC_SEEDS.filter((topic) => {
    const slugPhrase = topic.slug.replace(/-/g, " ");
    return normalized.includes(slugPhrase) || normalized.includes(topic.displayName.toLowerCase());
  }).map((topic) => topic.displayName);

  const entityScore = Math.min(
    1,
    matchedEntities.size * 0.2 + creatorMatches.length * 0.25 + (content.length >= 2 ? 0.15 : 0)
  );

  return {
    hasEntity: matchedEntities.size > 0 || creatorMatches.length > 0,
    entityScore,
    matchedEntities: [...matchedEntities].slice(0, 8),
    creatorMatches,
    topicMatches: topicMatches.slice(0, 5),
  };
}

export function isNamedEntityPhrase(phrase: string) {
  const detection = detectEntities(phrase);
  return detection.hasEntity && detection.entityScore >= 0.35;
}
