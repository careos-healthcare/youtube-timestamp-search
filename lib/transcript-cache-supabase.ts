import type {
  CachedTranscript,
  CachedTranscriptSummary,
  CachedTranscriptSegment,
  IndexedTranscriptSearchResult,
} from "@/lib/transcript-cache";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { formatTimestampFromMs, getYouTubeWatchUrl, normalizeText } from "@/lib/youtube";

const SEGMENT_BATCH_SIZE = 500;

export type SupabaseTranscriptWriteStep =
  | "client_unavailable"
  | "upsert_transcript"
  | "delete_segments"
  | "insert_segments"
  | "unexpected";

export type SupabaseTranscriptWriteResult =
  | { ok: true }
  | {
      ok: false;
      step: SupabaseTranscriptWriteStep;
      message: string;
      code?: string;
      details?: string;
      hint?: string;
      batchOffset?: number;
      segmentCount?: number;
    };

function failureFromPostgrest(
  step: Exclude<SupabaseTranscriptWriteStep, "client_unavailable" | "unexpected">,
  error: { message: string; code?: string; details?: string | null; hint?: string | null },
  extra?: Pick<Extract<SupabaseTranscriptWriteResult, { ok: false }>, "batchOffset" | "segmentCount">
): Extract<SupabaseTranscriptWriteResult, { ok: false }> {
  return {
    ok: false,
    step,
    message: error.message,
    code: error.code,
    details: error.details ?? undefined,
    hint: error.hint ?? undefined,
    ...extra,
  };
}

export function formatSupabaseWriteFailure(
  result: Extract<SupabaseTranscriptWriteResult, { ok: false }>
) {
  return [
    `Supabase ${result.step} failed`,
    result.message,
    result.code ? `code=${result.code}` : null,
    result.details ? `details=${result.details}` : null,
    result.hint ? `hint=${result.hint}` : null,
    result.batchOffset != null ? `batchOffset=${result.batchOffset}` : null,
    result.segmentCount != null ? `segmentCount=${result.segmentCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function normalizeVideoId(videoId: string) {
  return videoId.trim();
}

function mapSegments(rows: Array<{
  segment_index: number;
  text: string;
  start_seconds: number | null;
  duration_seconds: number | null;
}>): CachedTranscriptSegment[] {
  return rows
    .sort((a, b) => a.segment_index - b.segment_index)
    .map((row) => ({
      text: row.text,
      start: Number(row.start_seconds ?? 0),
      duration: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
    }));
}

export type ReadSupabaseTranscriptOptions = {
  /** When set, only fetch the first N segments (ordered by index). Reduces load for huge transcripts. */
  maxSegments?: number;
};

export async function readSupabaseTranscript(
  videoId: string,
  options?: ReadSupabaseTranscriptOptions
): Promise<CachedTranscript | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const normalizedId = normalizeVideoId(videoId);

  try {
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .select("id, video_id, video_url, title, channel_name, category, topic, creator_name, fetched_at")
      .eq("video_id", normalizedId)
      .maybeSingle();

    if (transcriptError || !transcript?.id) {
      return null;
    }

    const transcriptId = transcript.id;

    let segmentsQuery = supabase
      .from("transcript_segments")
      .select("segment_index, text, start_seconds, duration_seconds")
      .eq("transcript_id", transcriptId)
      .order("segment_index", { ascending: true });

    const cap = options?.maxSegments;
    if (cap != null && Number.isFinite(cap) && cap > 0) {
      segmentsQuery = segmentsQuery.limit(Math.floor(cap));
    }

    const { data: segments, error: segmentsError } = await segmentsQuery;

    if (segmentsError || !segments || segments.length === 0) {
      return null;
    }

    return {
      videoId: transcript.video_id,
      videoUrl: transcript.video_url ?? getYouTubeWatchUrl(transcript.video_id),
      title: transcript.title ?? undefined,
      channelName: transcript.channel_name ?? undefined,
      category: transcript.category ?? undefined,
      topic: transcript.topic ?? undefined,
      creatorName: transcript.creator_name ?? undefined,
      fetchedAt: transcript.fetched_at,
      segments: mapSegments(segments),
    };
  } catch {
    return null;
  }
}

export async function writeSupabaseTranscript(
  transcript: CachedTranscript
): Promise<SupabaseTranscriptWriteResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      step: "client_unavailable",
      message: "Supabase admin client is not configured",
    };
  }

  const normalizedId = normalizeVideoId(transcript.videoId);

  try {
    const { data: upserted, error: upsertError } = await supabase
      .from("transcripts")
      .upsert(
        {
          video_id: normalizedId,
          video_url: transcript.videoUrl,
          title: transcript.title ?? null,
          channel_name: transcript.channelName ?? null,
          category: transcript.category ?? null,
          topic: transcript.topic ?? null,
          creator_name: transcript.creatorName ?? null,
          fetched_at: transcript.fetchedAt,
        },
        { onConflict: "video_id" }
      )
      .select("id")
      .single();

    if (upsertError) {
      return failureFromPostgrest("upsert_transcript", upsertError, {
        segmentCount: transcript.segments.length,
      });
    }

    if (!upserted?.id) {
      return {
        ok: false,
        step: "upsert_transcript",
        message: "Upsert succeeded but no transcript id was returned",
        segmentCount: transcript.segments.length,
      };
    }

    const transcriptId = upserted.id;

    const { error: deleteError } = await supabase
      .from("transcript_segments")
      .delete()
      .eq("transcript_id", transcriptId);

    if (deleteError) {
      return failureFromPostgrest("delete_segments", deleteError, {
        segmentCount: transcript.segments.length,
      });
    }

    for (let offset = 0; offset < transcript.segments.length; offset += SEGMENT_BATCH_SIZE) {
      const batch = transcript.segments.slice(offset, offset + SEGMENT_BATCH_SIZE);
      const rows = batch.map((segment, index) => ({
        transcript_id: transcriptId,
        video_id: normalizedId,
        segment_index: offset + index,
        text: segment.text,
        start_seconds: segment.start,
        duration_seconds: segment.duration ?? null,
      }));

      const { error: insertError } = await supabase.from("transcript_segments").insert(rows);
      if (insertError) {
        return failureFromPostgrest("insert_segments", insertError, {
          batchOffset: offset,
          segmentCount: transcript.segments.length,
        });
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      step: "unexpected",
      message: error instanceof Error ? error.message : "Unknown Supabase write error",
      segmentCount: transcript.segments.length,
    };
  }
}

export async function listSupabaseTranscripts(): Promise<CachedTranscriptSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("transcripts")
      .select("video_id, video_url, title, channel_name, fetched_at, transcript_segments(count)")
      .order("fetched_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      videoId: row.video_id,
      videoUrl: row.video_url ?? getYouTubeWatchUrl(row.video_id),
      title: row.title ?? undefined,
      channelName: row.channel_name ?? undefined,
      fetchedAt: row.fetched_at,
      segmentCount: row.transcript_segments?.[0]?.count ?? 0,
    }));
  } catch {
    return [];
  }
}

function buildSnippetFromRows(
  rows: Array<{ segment_index: number; text: string }>,
  targetIndex: number
) {
  const byIndex = new Map(rows.map((row) => [row.segment_index, row.text]));
  const parts = [targetIndex - 1, targetIndex, targetIndex + 1]
    .map((index) => byIndex.get(index))
    .filter((value): value is string => Boolean(value));
  return normalizeText(parts.join(" "));
}

export async function searchSupabaseTranscripts(
  query: string,
  limit = 20
): Promise<IndexedTranscriptSearchResult[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const isBuild = typeof process !== "undefined" && process.env.npm_lifecycle_event === "build";
  const isVercel = typeof process !== "undefined" && process.env.VERCEL === "1";
  const rpcResultLimit = isBuild
    ? Math.min(Math.max(limit * 5, 50), 80)
    : isVercel
      ? Math.min(Math.max(limit * 5, 50), 95)
      : Math.max(limit * 5, 50);

  try {
    const { data, error } = await supabase.rpc("search_transcript_index", {
      search_query: normalizedQuery,
      result_limit: rpcResultLimit,
    });

    if (error || !data) {
      return searchSupabaseTranscriptsWithIlike(normalizedQuery, limit);
    }

    const grouped = new Map<string, IndexedTranscriptSearchResult>();

    for (const row of data) {
      const existing = grouped.get(row.video_id);
      const match = {
        start: Number(row.start_seconds ?? 0),
        timestamp: formatTimestampFromMs(Number(row.start_seconds ?? 0) * 1000),
        snippet: row.text,
        text: row.text,
      };

      if (!existing) {
        grouped.set(row.video_id, {
          videoId: row.video_id,
          videoUrl: row.video_url ?? getYouTubeWatchUrl(row.video_id),
          title: row.title ?? undefined,
          channelName: row.channel_name ?? undefined,
          score: Number(row.score ?? 0),
          matches: [match],
        });
        continue;
      }

      const previous = existing.matches.at(-1);
      if (previous && Math.abs(previous.start - match.start) < 3) {
        continue;
      }

      existing.score += Number(row.score ?? 0);
      if (existing.matches.length < 5) {
        existing.matches.push(match);
      }
    }

    return [...grouped.values()]
      .sort((left, right) => right.score - left.score || right.matches.length - left.matches.length)
      .slice(0, limit);
  } catch {
    return searchSupabaseTranscriptsWithIlike(normalizedQuery, limit);
  }
}

async function searchSupabaseTranscriptsWithIlike(
  normalizedQuery: string,
  limit: number
): Promise<IndexedTranscriptSearchResult[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const isBuild = typeof process !== "undefined" && process.env.npm_lifecycle_event === "build";
    const isVercel = typeof process !== "undefined" && process.env.VERCEL === "1";
    const rowCap = isBuild
      ? Math.min(Math.max(limit * 10, 50), 120)
      : isVercel
        ? Math.min(Math.max(limit * 10, 50), 140)
        : Math.max(limit * 10, 50);

    const { data, error } = await supabase
      .from("transcript_segments")
      .select(
        "video_id, segment_index, text, start_seconds, duration_seconds, transcripts(video_url, title, channel_name)"
      )
      .ilike("text", `%${normalizedQuery}%`)
      .limit(rowCap);

    if (error || !data) {
      return [];
    }

    const grouped = new Map<string, IndexedTranscriptSearchResult & { rows: typeof data }>();

    for (const row of data) {
      const transcript = Array.isArray(row.transcripts) ? row.transcripts[0] : row.transcripts;
      const bucket =
        grouped.get(row.video_id) ??
        ({
          videoId: row.video_id,
          videoUrl: transcript?.video_url ?? getYouTubeWatchUrl(row.video_id),
          title: transcript?.title ?? undefined,
          channelName: transcript?.channel_name ?? undefined,
          score: 0,
          matches: [],
          rows: [],
        } as IndexedTranscriptSearchResult & { rows: typeof data });

      bucket.rows.push(row);
      bucket.score += 1;
      grouped.set(row.video_id, bucket);
    }

    return [...grouped.values()]
      .map(({ rows, ...result }) => {
        const sortedRows = [...rows].sort((a, b) => a.segment_index - b.segment_index);
        const matches = sortedRows.slice(0, 5).map((row) => ({
          start: Number(row.start_seconds ?? 0),
          timestamp: formatTimestampFromMs(Number(row.start_seconds ?? 0) * 1000),
          snippet: buildSnippetFromRows(sortedRows, row.segment_index),
          text: row.text,
        }));
        return { ...result, matches };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}
