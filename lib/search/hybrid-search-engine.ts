import { getCachedTranscript } from "@/lib/transcript-cache";

import { searchKeywordTranscripts } from "@/lib/search/keyword-search-provider";
import { rankIndexedResults, type RankableMoment } from "@/lib/search/hybrid-ranking";
import {
  getSearchRuntimeConfig,
  getSearchModeLabel,
  getSemanticFallbackReason,
} from "@/lib/search/search-config";
import { searchSemanticTranscripts } from "@/lib/search/semantic-search-provider";
import type { HybridSearchDiagnostics, IndexedTranscriptSearchResult } from "@/lib/search/types";

async function enrichResultsWithMetadata(results: IndexedTranscriptSearchResult[]) {
  const enriched: IndexedTranscriptSearchResult[] = [];

  for (const result of results) {
    if (result.category || result.topic || result.creatorName) {
      enriched.push(result);
      continue;
    }

    const cached = await getCachedTranscript(result.videoId);
    enriched.push({
      ...result,
      title: result.title ?? cached?.title,
      channelName: result.channelName ?? cached?.channelName,
      category: cached?.category,
      topic: cached?.topic,
      creatorName: cached?.creatorName,
    });
  }

  return enriched;
}

function buildDiagnostics(
  partial: Omit<
    HybridSearchDiagnostics,
    "mode" | "searchMode" | "semanticEnabled" | "semanticAvailable" | "embeddingModel"
  >
): HybridSearchDiagnostics {
  const config = getSearchRuntimeConfig();
  const mode = getSearchModeLabel();

  return {
    ...partial,
    mode,
    searchMode: mode,
    semanticEnabled: config.semanticSearchEnabled,
    semanticAvailable: config.semanticAvailable,
    embeddingModel: config.embeddingModel,
  };
}

export async function hybridSearchTranscripts(
  query: string,
  limit = 20,
  options?: { momentLimit?: number }
): Promise<{
  results: IndexedTranscriptSearchResult[];
  moments: RankableMoment[];
  diagnostics: HybridSearchDiagnostics;
}> {
  const trimmed = query.trim();
  const config = getSearchRuntimeConfig();

  if (!trimmed) {
    return {
      results: [],
      moments: [],
      diagnostics: buildDiagnostics({
        keywordResultCount: 0,
        semanticResultCount: 0,
        hybridApplied: false,
        semanticFallback: true,
        fallbackReason: "empty_query",
      }),
    };
  }

  const keywordResults = await enrichResultsWithMetadata(
    await searchKeywordTranscripts(trimmed, Math.max(limit * 2, 30))
  );

  if (!config.hybridSearchEnabled) {
    return {
      results: keywordResults.slice(0, limit),
      moments: [],
      diagnostics: buildDiagnostics({
        keywordResultCount: keywordResults.length,
        semanticResultCount: 0,
        hybridApplied: false,
        semanticFallback: !config.semanticSearchEnabled,
        fallbackReason: config.semanticSearchEnabled ? "hybrid_disabled" : getSemanticFallbackReason(),
      }),
    };
  }

  const semantic = await searchSemanticTranscripts(trimmed, Math.max(limit * 2, 30));
  const semanticFallback =
    config.semanticSearchEnabled &&
    (semantic.hits.length === 0 || Boolean(semantic.fallbackReason));

  const fallbackReason =
    semantic.fallbackReason ??
    (semantic.hits.length === 0 && config.semanticSearchEnabled ? "semantic_zero_hits" : getSemanticFallbackReason());

  const ranked = rankIndexedResults(
    trimmed,
    keywordResults,
    semantic.hits,
    options?.momentLimit ?? limit * 2
  );

  return {
    results: ranked.results.slice(0, limit),
    moments: ranked.moments,
    diagnostics: buildDiagnostics({
      keywordResultCount: keywordResults.length,
      semanticResultCount: semantic.hits.length,
      hybridApplied: true,
      semanticFallback,
      fallbackReason: semanticFallback ? fallbackReason : undefined,
      semanticProvider: semantic.provider,
    }),
  };
}

export async function hybridSearchTranscriptsSimple(query: string, limit = 20) {
  const { results } = await hybridSearchTranscripts(query, limit);
  return results;
}
