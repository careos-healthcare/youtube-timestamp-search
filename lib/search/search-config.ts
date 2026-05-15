import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";

import {
  getEmbeddingModelName,
  isEmbeddingProviderAvailable,
} from "@/lib/search/embedding-provider";

export type SearchRuntimeConfig = {
  hybridSearchEnabled: boolean;
  semanticSearchEnabled: boolean;
  embeddingsConfigured: boolean;
  semanticAvailable: boolean;
  embeddingModel: string;
  exactPhraseBoost: number;
  semanticWeight: number;
  titleMetadataBoost: number;
  maxMomentsPerVideo: number;
  maxMomentsPerChannel: number;
  minTimestampGapSeconds: number;
  minSemanticSimilarity: number;
};

function readBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function isEmbeddingsConfigured() {
  return isEmbeddingProviderAvailable() && isSupabaseTranscriptStoreConfigured();
}

export function isSemanticInfrastructureAvailable() {
  return isEmbeddingsConfigured();
}

export function getSearchRuntimeConfig(): SearchRuntimeConfig {
  const embeddingsConfigured = isEmbeddingsConfigured();
  const semanticAvailable = embeddingsConfigured;
  const isNpmBuild = typeof process !== "undefined" && process.env.npm_lifecycle_event === "build";
  const semanticSearchEnabled =
    !isNpmBuild &&
    readBooleanFlag(process.env.SEMANTIC_SEARCH_ENABLED, false) &&
    semanticAvailable;
  const hybridSearchEnabled = readBooleanFlag(process.env.HYBRID_SEARCH_ENABLED, true);

  return {
    hybridSearchEnabled,
    semanticSearchEnabled,
    embeddingsConfigured,
    semanticAvailable,
    embeddingModel: getEmbeddingModelName(),
    exactPhraseBoost: Number(process.env.HYBRID_EXACT_PHRASE_BOOST ?? 15),
    semanticWeight: Number(process.env.HYBRID_SEMANTIC_WEIGHT ?? 20),
    titleMetadataBoost: Number(process.env.HYBRID_TITLE_METADATA_BOOST ?? 6),
    maxMomentsPerVideo: Number(process.env.HYBRID_MAX_MOMENTS_PER_VIDEO ?? 2),
    maxMomentsPerChannel: Number(process.env.HYBRID_MAX_MOMENTS_PER_CHANNEL ?? 6),
    minTimestampGapSeconds: Number(process.env.HYBRID_MIN_TIMESTAMP_GAP_SECONDS ?? 45),
    minSemanticSimilarity: Number(process.env.HYBRID_MIN_SEMANTIC_SIMILARITY ?? 0.25),
  };
}

export function getSearchModeLabel() {
  const config = getSearchRuntimeConfig();
  if (config.semanticSearchEnabled) return "hybrid-keyword-semantic";
  if (config.hybridSearchEnabled) return "hybrid-keyword";
  return "keyword-only";
}

export function getSemanticFallbackReason(): string | undefined {
  if (!readBooleanFlag(process.env.SEMANTIC_SEARCH_ENABLED, false)) {
    return "semantic_disabled";
  }
  if (!isEmbeddingProviderAvailable()) {
    return "embedding_provider_unavailable";
  }
  if (!isSupabaseTranscriptStoreConfigured()) {
    return "supabase_unavailable";
  }
  return undefined;
}
