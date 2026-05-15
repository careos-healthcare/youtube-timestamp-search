import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { synthesizeMultiVideoAnswer } from "@/lib/search/multi-video-synthesis";
import { buildTopicAuthorityLeaderboards } from "@/lib/knowledge-graph/authority-scoring";
import { buildConceptLineage } from "@/lib/knowledge-graph/concept-lineage";
import { topCoOccurrences } from "@/lib/knowledge-graph/co-occurrence";
import {
  buildCreatorExpertiseProfiles,
  creatorExpertiseRelationships,
} from "@/lib/knowledge-graph/creator-expertise";
import {
  extractEntitiesFromPhrase,
  extractEntitiesFromTranscriptSnippet,
  mergeEntities,
  type KnowledgeEntity,
} from "@/lib/knowledge-graph/entities";
import { baselineMoatFromCorpus, computeSearchMoatMetrics } from "@/lib/knowledge-graph/moat-metrics";
import { mergeRelationships, type KnowledgeRelationship } from "@/lib/knowledge-graph/relationships";
import { buildTopicNodes } from "@/lib/knowledge-graph/topics";

export type KnowledgeGraph = {
  generatedAt: string;
  entities: KnowledgeEntity[];
  topics: ReturnType<typeof buildTopicNodes>;
  relationships: KnowledgeRelationship[];
  coOccurrences: ReturnType<typeof topCoOccurrences>;
  conceptLineage: ReturnType<typeof buildConceptLineage>;
  creatorProfiles: ReturnType<typeof buildCreatorExpertiseProfiles>;
  authorityLeaderboards: ReturnType<typeof buildTopicAuthorityLeaderboards>;
  synthesisSamples: ReturnType<typeof synthesizeMultiVideoAnswer>[];
  moatMetrics: ReturnType<typeof computeSearchMoatMetrics>;
  indexedVideosScanned: number;
  snippetsProcessed: number;
};

async function loadCorpusSnippets(limitVideos = 40) {
  const summaries = await listCachedTranscripts();
  const snippets: string[] = [];

  for (const summary of summaries.slice(0, limitVideos)) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached) continue;
    for (const segment of cached.segments.slice(0, 40)) {
      snippets.push(segment.text);
    }
  }

  return {
    snippets,
    indexedVideosScanned: Math.min(summaries.length, limitVideos),
    searchableSegments: summaries.reduce((sum, item) => sum + item.segmentCount, 0),
    indexedVideos: summaries.length,
  };
}

export async function buildKnowledgeGraph(sampleQueryLimit = 8): Promise<KnowledgeGraph> {
  const corpus = await loadCorpusSnippets();
  let entities: KnowledgeEntity[] = [];
  const relationships = creatorExpertiseRelationships();

  for (const snippet of corpus.snippets) {
    entities = mergeEntities(entities, extractEntitiesFromTranscriptSnippet(snippet));
  }

  for (const seed of PRIORITY_SEARCH_QUERIES.slice(0, 20)) {
    entities = mergeEntities(entities, extractEntitiesFromPhrase(seed.phrase, 2));
  }

  const coOccurrences = topCoOccurrences(corpus.snippets, 60);
  for (const edge of coOccurrences.slice(0, 30)) {
    relationships.push({
      id: `co_occurs:${edge.left}->${edge.right}`,
      sourceId: `entity:${edge.left}`,
      targetId: `entity:${edge.right}`,
      type: "co_occurs",
      weight: edge.count,
    });
  }

  const synthesisSamples = [];
  for (const seed of PRIORITY_SEARCH_QUERIES.slice(0, sampleQueryLimit)) {
    const landing = await getSearchLandingData(seed.phrase, 20, { disableTimeout: true });
    synthesisSamples.push(synthesizeMultiVideoAnswer(seed.phrase, landing.moments));
    entities = mergeEntities(entities, extractEntitiesFromPhrase(seed.phrase, 3));
  }

  const authorityLeaderboards = buildTopicAuthorityLeaderboards({ entities });
  const moatMetrics = computeSearchMoatMetrics({
    entities,
    indexedVideos: corpus.indexedVideos,
    searchableSegments: corpus.searchableSegments,
    synthesisSamples,
    topicCount: buildTopicNodes().length,
    creatorCount: CREATOR_SEEDS.length,
  });

  if (synthesisSamples.length === 0) {
    Object.assign(
      moatMetrics,
      baselineMoatFromCorpus(corpus.indexedVideos, corpus.searchableSegments, entities)
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    entities: entities.slice(0, 200),
    topics: buildTopicNodes(),
    relationships: mergeRelationships([], relationships).slice(0, 300),
    coOccurrences,
    conceptLineage: buildConceptLineage(),
    creatorProfiles: buildCreatorExpertiseProfiles(),
    authorityLeaderboards: authorityLeaderboards.slice(0, 20),
    synthesisSamples,
    moatMetrics,
    indexedVideosScanned: corpus.indexedVideosScanned,
    snippetsProcessed: corpus.snippets.length,
  };
}

export function formatKnowledgeGraphMarkdown(graph: KnowledgeGraph) {
  const entityRows = graph.entities
    .slice(0, 20)
    .map(
      (entity, index) =>
        `| ${index + 1} | ${entity.label.replace(/\|/g, "\\|")} | ${entity.type} | ${entity.frequency} |`
    )
    .join("\n");

  const authoritySection = graph.authorityLeaderboards
    .slice(0, 10)
    .map((board, index) => {
      const leader = board.leaders[0];
      return `${index + 1}. **${board.topic}** — top explainer: ${leader?.displayName ?? "n/a"} (${leader?.score ?? 0})`;
    })
    .join("\n");

  const synthesisSection = graph.synthesisSamples
    .slice(0, 8)
    .map(
      (sample, index) =>
        `${index + 1}. **${sample.query}** — themes: ${sample.recurringThemes.slice(0, 4).join(", ") || "n/a"}; videos: ${sample.videoProfiles.length}`
    )
    .join("\n");

  return `# Knowledge Graph Report

Generated: ${graph.generatedAt}
Indexed videos scanned: ${graph.indexedVideosScanned}
Snippets processed: ${graph.snippetsProcessed}
Entities: ${graph.entities.length}
Relationships: ${graph.relationships.length}

## Search moat metrics

| Metric | Value |
|--------|------:|
| Answer coverage % | ${graph.moatMetrics.answerCoveragePercent} |
| Topic depth | ${graph.moatMetrics.topicDepth} |
| Entity coverage | ${graph.moatMetrics.entityCoverage} |
| Semantic overlap | ${graph.moatMetrics.semanticOverlap} |
| Explanation diversity | ${graph.moatMetrics.explanationDiversity} |
| Creator authority distribution | ${graph.moatMetrics.creatorAuthorityDistribution} |

## Top entities

| Rank | Entity | Type | Frequency |
|------|--------|------|----------:|
${entityRows || "| — | — | — | — |"}

## Topic authority leaders

${authoritySection || "_No authority leaders yet._"}

## Multi-video synthesis samples

${synthesisSection || "_No synthesis samples yet._"}

## Regenerate

\`\`\`bash
npm run graph:build
npm run graph:validate
\`\`\`

Machine-readable output: \`data/knowledge-graph/graph.json\`
`;
}
