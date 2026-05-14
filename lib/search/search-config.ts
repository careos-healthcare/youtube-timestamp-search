export type SearchRuntimeConfig = {
  hybridSearchEnabled: boolean;
  semanticSearchEnabled: boolean;
  embeddingsConfigured: boolean;
  embeddingModel: string;
  exactPhraseBoost: number;
  semanticWeight: number;
  titleMetadataBoost: number;
  maxMomentsPerVideo: number;
  maxMomentsPerChannel: number;
  minTimestampGapSeconds: number;
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
  const provider = process.env.SEMANTIC_EMBEDDING_PROVIDER?.trim().toLowerCase();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (provider === "openai") {
    return Boolean(openAiKey);
  }

  if (provider === "supabase") {
    return Boolean(supabaseUrl && serviceKey);
  }

  return Boolean(openAiKey);
}

export function getSearchRuntimeConfig(): SearchRuntimeConfig {
  const embeddingsConfigured = isEmbeddingsConfigured();
  const semanticSearchEnabled =
    readBooleanFlag(process.env.SEMANTIC_SEARCH_ENABLED, false) && embeddingsConfigured;
  const hybridSearchEnabled = readBooleanFlag(process.env.HYBRID_SEARCH_ENABLED, true);

  return {
    hybridSearchEnabled,
    semanticSearchEnabled,
    embeddingsConfigured,
    embeddingModel: process.env.SEMANTIC_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    exactPhraseBoost: Number(process.env.HYBRID_EXACT_PHRASE_BOOST ?? 15),
    semanticWeight: Number(process.env.HYBRID_SEMANTIC_WEIGHT ?? 20),
    titleMetadataBoost: Number(process.env.HYBRID_TITLE_METADATA_BOOST ?? 6),
    maxMomentsPerVideo: Number(process.env.HYBRID_MAX_MOMENTS_PER_VIDEO ?? 2),
    maxMomentsPerChannel: Number(process.env.HYBRID_MAX_MOMENTS_PER_CHANNEL ?? 6),
    minTimestampGapSeconds: Number(process.env.HYBRID_MIN_TIMESTAMP_GAP_SECONDS ?? 45),
  };
}

export function getSearchModeLabel() {
  const config = getSearchRuntimeConfig();
  if (config.semanticSearchEnabled) return "hybrid-keyword-semantic";
  if (config.hybridSearchEnabled) return "hybrid-keyword";
  return "keyword-only";
}
