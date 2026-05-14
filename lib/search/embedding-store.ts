import { getSupabaseAdminClient } from "@/lib/supabase";

import { getEmbeddingModelName } from "@/lib/search/embedding-provider";
import type { SemanticSearchHit } from "@/lib/search/types";

export type SegmentEmbeddingCandidate = {
  videoId: string;
  segmentIndex: number;
  transcriptId?: string;
  startSeconds: number;
  text: string;
  textHash: string;
};

export type SegmentEmbeddingUpsert = SegmentEmbeddingCandidate & {
  embedding: number[];
  embeddingModel: string;
  dimensions: number;
};

const SEGMENT_PAGE_SIZE = 500;

export async function listSegmentEmbeddingCandidates(options?: {
  limit?: number;
  videoId?: string;
  offset?: number;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const limit = options?.limit ?? SEGMENT_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("transcript_segments")
    .select("video_id, segment_index, text, start_seconds, transcript_id")
    .order("video_id", { ascending: true })
    .order("segment_index", { ascending: true })
    .range(offset, offset + limit - 1);

  if (options?.videoId) {
    query = query.eq("video_id", options.videoId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    videoId: row.video_id,
    segmentIndex: Number(row.segment_index ?? 0),
    transcriptId: row.transcript_id ?? undefined,
    startSeconds: Number(row.start_seconds ?? 0),
    text: row.text ?? "",
    textHash: "",
  }));
}

export async function loadEmbeddedTextHashes(options?: {
  videoId?: string;
  embeddingModel?: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Set<string>();

  const model = options?.embeddingModel ?? getEmbeddingModelName();
  let query = supabase
    .from("segment_embeddings")
    .select("text_hash, video_id, segment_index")
    .eq("embedding_model", model)
    .not("embedding", "is", null)
    .not("text_hash", "is", null);

  if (options?.videoId) {
    query = query.eq("video_id", options.videoId);
  }

  const { data, error } = await query;
  if (error || !data) return new Set<string>();

  return new Set(
    data
      .map((row) => row.text_hash)
      .filter((value): value is string => Boolean(value))
  );
}

export async function upsertSegmentEmbeddings(rows: SegmentEmbeddingUpsert[]) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (rows.length === 0) return 0;

  const payload = rows.map((row) => ({
    video_id: row.videoId,
    segment_index: row.segmentIndex,
    transcript_id: row.transcriptId ?? null,
    start_seconds: row.startSeconds,
    text_hash: row.textHash,
    embedding_model: row.embeddingModel,
    dimensions: row.dimensions,
    embedding: row.embedding,
    embedded_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("segment_embeddings").upsert(payload, {
    onConflict: "video_id,segment_index,embedding_model",
  });

  if (error) {
    throw new Error(`Failed to upsert segment embeddings: ${error.message}`);
  }

  return rows.length;
}

export async function searchEmbeddingsByVector(
  queryEmbedding: number[],
  options?: {
    matchCount?: number;
    minSimilarity?: number;
    embeddingModel?: string;
  }
): Promise<SemanticSearchHit[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("search_segment_embeddings", {
    query_embedding: queryEmbedding,
    match_count: options?.matchCount ?? 20,
    min_similarity: options?.minSimilarity ?? 0.25,
    embedding_model: options?.embeddingModel ?? getEmbeddingModelName(),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "search_segment_embeddings returned no data");
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
}

export async function countEmbeddedSegments(embeddingModel?: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const model = embeddingModel ?? getEmbeddingModelName();
  const { count, error } = await supabase
    .from("segment_embeddings")
    .select("id", { count: "exact", head: true })
    .eq("embedding_model", model)
    .not("embedding", "is", null);

  if (error) return 0;
  return count ?? 0;
}
