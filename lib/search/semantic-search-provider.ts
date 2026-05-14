import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizeText } from "@/lib/youtube";

import { getSearchRuntimeConfig, isEmbeddingsConfigured } from "@/lib/search/search-config";
import type { SemanticSearchHit } from "@/lib/search/types";

export type SemanticSearchProvider = {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, limit: number): Promise<SemanticSearchHit[]>;
};

function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function lexicalSimilarity(query: string, text: string) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;

  const textTokens = new Set(tokenize(text));
  let overlap = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) overlap += 1;
  }

  return overlap / queryTokens.size;
}

class NoOpSemanticSearchProvider implements SemanticSearchProvider {
  readonly name = "disabled";

  isAvailable() {
    return false;
  }

  async search() {
    return [];
  }
}

class SupabaseVectorSemanticSearchProvider implements SemanticSearchProvider {
  readonly name = "supabase-vector";

  isAvailable() {
    return isEmbeddingsConfigured();
  }

  async search(query: string, limit: number): Promise<SemanticSearchHit[]> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    try {
      const { data, error } = await supabase.rpc("search_segment_embeddings", {
        search_query: normalizedQuery,
        result_limit: Math.max(limit * 3, 30),
      });

      if (error || !data) {
        return [];
      }

      return data.map((row: {
        video_id: string;
        segment_index: number;
        start_seconds: number | string;
        text: string;
        similarity: number | string;
      }) => ({
        videoId: row.video_id,
        segmentIndex: Number(row.segment_index ?? 0),
        startSeconds: Number(row.start_seconds ?? 0),
        text: row.text,
        snippet: row.text,
        similarity: Number(row.similarity ?? 0),
      }));
    } catch {
      return [];
    }
  }
}

class LexicalSemanticPlaceholderProvider implements SemanticSearchProvider {
  readonly name = "lexical-placeholder";

  isAvailable() {
    return true;
  }

  async search(query: string, limit: number): Promise<SemanticSearchHit[]> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    const { data, error } = await supabase
      .from("transcript_segments")
      .select("video_id, segment_index, text, start_seconds")
      .ilike("text", `%${normalizedQuery.split(/\s+/)[0] ?? normalizedQuery}%`)
      .limit(Math.max(limit * 8, 40));

    if (error || !data) return [];

    const ranked = data
      .map((row) => {
        const similarity = lexicalSimilarity(normalizedQuery, row.text ?? "");
        return {
          videoId: row.video_id,
          segmentIndex: Number(row.segment_index ?? 0),
          startSeconds: Number(row.start_seconds ?? 0),
          text: row.text ?? "",
          snippet: row.text ?? "",
          similarity,
        };
      })
      .filter((row) => row.similarity >= 0.34)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, limit);

    return ranked;
  }
}

export function createSemanticSearchProvider(): SemanticSearchProvider {
  const config = getSearchRuntimeConfig();
  if (!config.semanticSearchEnabled) {
    return new NoOpSemanticSearchProvider();
  }

  const provider = process.env.SEMANTIC_EMBEDDING_PROVIDER?.trim().toLowerCase();
  if (provider === "supabase" && config.embeddingsConfigured) {
    return new SupabaseVectorSemanticSearchProvider();
  }

  if (process.env.SEMANTIC_LEXICAL_PLACEHOLDER === "true") {
    return new LexicalSemanticPlaceholderProvider();
  }

  return new NoOpSemanticSearchProvider();
}

export async function searchSemanticTranscripts(query: string, limit = 20) {
  const provider = createSemanticSearchProvider();
  if (!provider.isAvailable()) {
    return { provider: provider.name, hits: [] as SemanticSearchHit[] };
  }

  const hits = await provider.search(query, limit);
  return { provider: provider.name, hits };
}
