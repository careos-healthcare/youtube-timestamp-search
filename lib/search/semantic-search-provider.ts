import { embedQuery, EmbeddingProviderError } from "@/lib/search/embedding-provider";
import { searchEmbeddingsByVector } from "@/lib/search/embedding-store";
import {
  getSearchRuntimeConfig,
  getSemanticFallbackReason,
  isSemanticInfrastructureAvailable,
} from "@/lib/search/search-config";
import type { SemanticSearchHit } from "@/lib/search/types";

export type SemanticSearchProvider = {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, limit: number): Promise<SemanticSearchHit[]>;
};

export type SemanticSearchResponse = {
  provider: string;
  hits: SemanticSearchHit[];
  error?: string;
  fallbackReason?: string;
};

class NoOpSemanticSearchProvider implements SemanticSearchProvider {
  readonly name = "disabled";

  isAvailable() {
    return false;
  }

  async search() {
    return [];
  }
}

class OpenAiVectorSemanticSearchProvider implements SemanticSearchProvider {
  readonly name = "openai-supabase-vector";

  isAvailable() {
    return isSemanticInfrastructureAvailable();
  }

  async search(query: string, limit: number): Promise<SemanticSearchHit[]> {
    const config = getSearchRuntimeConfig();
    const embedded = await embedQuery(query);
    return searchEmbeddingsByVector(embedded.embedding, {
      matchCount: Math.max(limit * 3, 30),
      minSimilarity: config.minSemanticSimilarity,
      embeddingModel: embedded.model,
    });
  }
}

export function createSemanticSearchProvider(): SemanticSearchProvider {
  const config = getSearchRuntimeConfig();
  if (!config.semanticSearchEnabled) {
    return new NoOpSemanticSearchProvider();
  }

  if (!isSemanticInfrastructureAvailable()) {
    return new NoOpSemanticSearchProvider();
  }

  return new OpenAiVectorSemanticSearchProvider();
}

export async function searchSemanticTranscripts(
  query: string,
  limit = 20
): Promise<SemanticSearchResponse> {
  const config = getSearchRuntimeConfig();
  const provider = createSemanticSearchProvider();

  if (!config.semanticSearchEnabled) {
    return {
      provider: provider.name,
      hits: [],
      fallbackReason: getSemanticFallbackReason() ?? "semantic_disabled",
    };
  }

  if (!provider.isAvailable()) {
    return {
      provider: provider.name,
      hits: [],
      fallbackReason: getSemanticFallbackReason() ?? "semantic_unavailable",
    };
  }

  try {
    const hits = await provider.search(query, limit);
    if (hits.length === 0) {
      return {
        provider: provider.name,
        hits,
        fallbackReason: "semantic_zero_hits",
      };
    }

    return { provider: provider.name, hits };
  } catch (error) {
    if (error instanceof EmbeddingProviderError) {
      return {
        provider: provider.name,
        hits: [],
        error: error.message,
        fallbackReason: error.code,
      };
    }

    return {
      provider: provider.name,
      hits: [],
      error: error instanceof Error ? error.message : "semantic_search_failed",
      fallbackReason: "semantic_search_failed",
    };
  }
}
