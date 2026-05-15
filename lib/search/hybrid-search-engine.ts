import { getCachedTranscript } from "@/lib/transcript-cache";

import {
  cappedHybridFetchSize,
  maxHybridMetadataEnrichVideos,
} from "@/lib/search/build-corpus-caps";
import { searchKeywordTranscripts } from "@/lib/search/keyword-search-provider";
import { rankIndexedResults, type RankableMoment } from "@/lib/search/hybrid-ranking";
import {
  getSearchRuntimeConfig,
  getSearchModeLabel,
  getSemanticFallbackReason,
} from "@/lib/search/search-config";
import { searchSemanticTranscripts } from "@/lib/search/semantic-search-provider";
import type {
  HybridSearchDiagnostics,
  IndexedTranscriptSearchResult,
  SemanticSearchHit,
} from "@/lib/search/types";

async function enrichResultsWithMetadata(
  results: IndexedTranscriptSearchResult[],
  enrichCapOverride?: number | null
) {
  const enrichCap =
    enrichCapOverride !== undefined ? enrichCapOverride : maxHybridMetadataEnrichVideos();

  if (enrichCap === 0) {
    return results.map((r) => ({ ...r }));
  }

  const toEnrich = enrichCap != null && results.length > enrichCap ? results.slice(0, enrichCap) : results;
  const enriched: IndexedTranscriptSearchResult[] = [];

  for (const result of toEnrich) {
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

  if (enrichCap != null && results.length > enriched.length) {
    enriched.push(...results.slice(enriched.length));
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

export type HybridSearchTranscriptOptions = {
  momentLimit?: number;
  /** Skip semantic retrieval and ranking (keyword-only hybrid). */
  skipSemantic?: boolean;
  /** Hard cap on keyword transcript fetch size (before corpus caps). */
  keywordFetchCeiling?: number;
  /** Max videos to enrich with transcript metadata (0 = skip enrichment I/O). */
  enrichVideoCap?: number | null;
};

export async function hybridSearchTranscripts(
  query: string,
  limit = 20,
  options?: HybridSearchTranscriptOptions
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

  const baseKeywordFetch = cappedHybridFetchSize(Math.max(limit * 2, 30));
  const keywordFetchLimit =
    options?.keywordFetchCeiling != null
      ? Math.min(options.keywordFetchCeiling, baseKeywordFetch)
      : baseKeywordFetch;

  const keywordResults = await enrichResultsWithMetadata(
    await searchKeywordTranscripts(trimmed, keywordFetchLimit),
    options?.enrichVideoCap
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

  const semantic = options?.skipSemantic
    ? { provider: "skipped", hits: [] as SemanticSearchHit[], fallbackReason: undefined as string | undefined }
    : await searchSemanticTranscripts(trimmed, cappedHybridFetchSize(Math.max(limit * 2, 30)));

  const semanticHits: SemanticSearchHit[] = semantic.hits;

  const semanticFallback = options?.skipSemantic
    ? true
    : config.semanticSearchEnabled &&
      (semanticHits.length === 0 || Boolean(semantic.fallbackReason));

  const fallbackReason = options?.skipSemantic
    ? "skip_semantic"
    : semantic.fallbackReason ??
      (semanticHits.length === 0 && config.semanticSearchEnabled ? "semantic_zero_hits" : getSemanticFallbackReason());

  const ranked = rankIndexedResults(
    trimmed,
    keywordResults,
    semanticHits,
    options?.momentLimit ?? limit * 2
  );

  return {
    results: ranked.results.slice(0, limit),
    moments: ranked.moments,
    diagnostics: buildDiagnostics({
      keywordResultCount: keywordResults.length,
      semanticResultCount: semanticHits.length,
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
