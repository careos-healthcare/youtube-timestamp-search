import { CREATOR_SEEDS } from "@/lib/creator-seeds";

import { buildRelationship, type KnowledgeRelationship } from "@/lib/knowledge-graph/relationships";

export type CreatorExpertiseProfile = {
  creatorId: string;
  creatorSlug: string;
  displayName: string;
  topics: string[];
  authorityScore: number;
};

export function buildCreatorExpertiseProfiles(): CreatorExpertiseProfile[] {
  return CREATOR_SEEDS.map((creator) => ({
    creatorId: `creator:${creator.slug}`,
    creatorSlug: creator.slug,
    displayName: creator.displayName,
    topics: creator.popularTopics,
    authorityScore: Number((0.4 + creator.popularTopics.length * 0.08 + (creator.featured ? 0.2 : 0)).toFixed(2)),
  }));
}

export function creatorExpertiseRelationships(profiles = buildCreatorExpertiseProfiles()) {
  const relationships: KnowledgeRelationship[] = [];

  for (const profile of profiles) {
    for (const topic of profile.topics) {
      relationships.push(
        buildRelationship(profile.creatorId, `topic:${topic}`, "explains", profile.authorityScore)
      );
    }
  }

  return relationships;
}
