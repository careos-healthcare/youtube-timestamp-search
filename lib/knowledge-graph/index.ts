export {
  buildKnowledgeGraph,
  formatKnowledgeGraphMarkdown,
  type KnowledgeGraph,
} from "@/lib/knowledge-graph/graph-builder";

export { extractEntitiesFromPhrase, mergeEntities, type KnowledgeEntity } from "@/lib/knowledge-graph/entities";
export { buildTopicNodes, type KnowledgeTopicNode } from "@/lib/knowledge-graph/topics";
export { buildRelationship, mergeRelationships, type KnowledgeRelationship } from "@/lib/knowledge-graph/relationships";
export { buildCreatorExpertiseProfiles, creatorExpertiseRelationships } from "@/lib/knowledge-graph/creator-expertise";
export { topCoOccurrences, type CoOccurrenceEdge } from "@/lib/knowledge-graph/co-occurrence";
export { buildConceptLineage, findLineageForConcept } from "@/lib/knowledge-graph/concept-lineage";
export { buildTopicAuthorityLeaderboards, type AuthorityScore } from "@/lib/knowledge-graph/authority-scoring";
export { computeSearchMoatMetrics, type SearchMoatMetrics } from "@/lib/knowledge-graph/moat-metrics";
