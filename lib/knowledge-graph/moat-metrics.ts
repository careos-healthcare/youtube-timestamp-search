import type { MultiVideoSynthesis } from "@/lib/search/multi-video-synthesis";
import type { KnowledgeEntity } from "@/lib/knowledge-graph/entities";
import { TOPIC_KEYWORDS } from "@/lib/topic-keywords";

export type SearchMoatMetrics = {
  answerCoveragePercent: number;
  topicDepth: number;
  entityCoverage: number;
  semanticOverlap: number;
  explanationDiversity: number;
  creatorAuthorityDistribution: number;
};

export function computeSearchMoatMetrics(input: {
  entities: KnowledgeEntity[];
  indexedVideos: number;
  searchableSegments: number;
  synthesisSamples: MultiVideoSynthesis[];
  topicCount: number;
  creatorCount: number;
}) {
  const answered = input.synthesisSamples.filter((sample) => Boolean(sample.consensusExplanation)).length;
  const answerCoveragePercent =
    input.synthesisSamples.length > 0
      ? Number(((answered / input.synthesisSamples.length) * 100).toFixed(1))
      : 0;

  const topicDepth = Number((input.searchableSegments / Math.max(input.topicCount, 1)).toFixed(1));
  const entityCoverage = input.entities.length;
  const semanticOverlap =
    input.synthesisSamples.length > 0
      ? Number(
          (
            input.synthesisSamples.reduce((sum, sample) => sum + sample.recurringThemes.length, 0) /
            input.synthesisSamples.length
          ).toFixed(2)
        )
      : 0;

  const explanationDiversity =
    input.synthesisSamples.length > 0
      ? Number(
          (
            input.synthesisSamples.reduce((sum, sample) => sum + sample.videoProfiles.length, 0) /
            input.synthesisSamples.length
          ).toFixed(2)
        )
      : 0;

  const creatorAuthorityDistribution = Number(
    (input.creatorCount / Math.max(input.indexedVideos, 1)).toFixed(3)
  );

  return {
    answerCoveragePercent,
    topicDepth,
    entityCoverage,
    semanticOverlap,
    explanationDiversity,
    creatorAuthorityDistribution,
  } satisfies SearchMoatMetrics;
}

export function baselineMoatFromCorpus(indexedVideos: number, searchableSegments: number, entities: KnowledgeEntity[]) {
  return computeSearchMoatMetrics({
    entities,
    indexedVideos,
    searchableSegments,
    synthesisSamples: [],
    topicCount: TOPIC_KEYWORDS.length,
    creatorCount: 0,
  });
}
