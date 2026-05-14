import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import type { CreatorExpertiseProfile } from "@/lib/knowledge-graph/creator-expertise";
import { buildCreatorExpertiseProfiles } from "@/lib/knowledge-graph/creator-expertise";
import type { KnowledgeEntity } from "@/lib/knowledge-graph/entities";

export type AuthorityScore = {
  creatorId: string;
  displayName: string;
  topic: string;
  score: number;
  canonicalVideos: string[];
};

export type TopicAuthorityLeaderboard = {
  topic: string;
  leaders: AuthorityScore[];
};

export function scoreCreatorAuthorityForTopic(
  creator: CreatorExpertiseProfile,
  topic: string,
  entityHits: Map<string, number>,
  videoHits: Map<string, number>
): AuthorityScore {
  const topicKey = topic.toLowerCase();
  const entityBoost = entityHits.get(topicKey) ?? 0;
  const base = creator.topics.includes(topicKey) ? creator.authorityScore : creator.authorityScore * 0.35;
  const score = Number((base + Math.min(entityBoost / 20, 0.35)).toFixed(3));

  const canonicalVideos = [...videoHits.entries()]
    .filter(([videoId, count]) => videoId.includes(creator.creatorSlug) || count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([videoId]) => videoId);

  return {
    creatorId: creator.creatorId,
    displayName: creator.displayName,
    topic: topicKey,
    score,
    canonicalVideos,
  };
}

export function buildTopicAuthorityLeaderboards(input: {
  entities: KnowledgeEntity[];
  videoTopicHits?: Map<string, number>;
}) {
  const profiles = buildCreatorExpertiseProfiles();
  const entityHits = new Map(input.entities.map((entity) => [entity.label.toLowerCase(), entity.frequency]));
  const videoHits = input.videoTopicHits ?? new Map<string, number>();
  const topics = [...new Set(profiles.flatMap((profile) => profile.topics))];

  return topics
    .map((topic) => ({
      topic,
      leaders: profiles
        .map((profile) => scoreCreatorAuthorityForTopic(profile, topic, entityHits, videoHits))
        .sort((left, right) => right.score - left.score)
        .slice(0, 5),
    }))
    .sort((left, right) => (right.leaders[0]?.score ?? 0) - (left.leaders[0]?.score ?? 0));
}

export function findCanonicalCreatorsForTopic(topic: string) {
  const normalized = topic.toLowerCase();
  return CREATOR_SEEDS.filter(
    (creator) =>
      creator.popularTopics.some((entry) => entry.toLowerCase() === normalized) ||
      creator.displayName.toLowerCase().includes(normalized)
  ).map((creator) => creator.displayName);
}
