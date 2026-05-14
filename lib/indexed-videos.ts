import { getSupabaseAdminClient, isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";
import { listCachedTranscripts, getCachedTranscript } from "@/lib/transcript-cache";
import type { TranscriptCategorySlug } from "@/lib/category-data";
import {
  getRelatedCreatorsForKeywords,
  getRelatedTopicsForKeywords,
} from "@/lib/video-related-links";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type IndexedVideoSegment = {
  segmentIndex: number;
  text: string;
  start: number;
  duration?: number;
};

export type IndexedVideoTopicLink = {
  slug: string;
  label: string;
};

export type IndexedVideoCreatorLink = {
  slug: string;
  label: string;
};

export type IndexedVideo = {
  videoId: string;
  videoUrl: string;
  title: string;
  channelName?: string;
  category?: string;
  topic?: string;
  creatorName?: string;
  fetchedAt: string;
  segmentCount: number;
  previewSnippet: string;
  thumbnailUrl: string;
  relatedTopics: IndexedVideoTopicLink[];
  relatedCreators: IndexedVideoCreatorLink[];
};

export type IndexedVideosPage = {
  videos: IndexedVideo[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  source: "supabase" | "fallback";
};

const DEFAULT_LIMIT = 12;

function normalizeVideoId(videoId: string) {
  return videoId.trim();
}

export function getYouTubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${normalizeVideoId(videoId)}/mqdefault.jpg`;
}

function buildPreviewSnippet(segments: IndexedVideoSegment[]) {
  return segments
    .slice(0, 3)
    .map((segment) => segment.text)
    .join(" ")
    .trim()
    .slice(0, 280);
}

function extractKeywords(text: string, limit = 6) {
  const stopWords = new Set(["about", "after", "before", "could", "should", "their", "there", "these", "those", "video", "youtube"]);
  return [...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9'-]+/)
      .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter((word) => word.length >= 4 && !stopWords.has(word))
  )].slice(0, limit);
}

function enrichIndexedVideo(input: {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  category?: string;
  topic?: string;
  creatorName?: string;
  fetchedAt: string;
  segmentCount: number;
  previewSnippet: string;
}): IndexedVideo {
  const keywords = extractKeywords(`${input.title ?? ""} ${input.channelName ?? ""} ${input.previewSnippet}`);
  const relatedTopics = getRelatedTopicsForKeywords(keywords, 4).map((topic) => ({
    slug: topic.slug,
    label: topic.displayName,
  }));
  const relatedCreators = getRelatedCreatorsForKeywords(keywords, 4).map((creator) => ({
    slug: creator.slug,
    label: creator.displayName,
  }));

  return {
    videoId: input.videoId,
    videoUrl: input.videoUrl,
    title: input.title ?? `YouTube video ${input.videoId}`,
    channelName: input.channelName,
    category: input.category,
    topic: input.topic,
    creatorName: input.creatorName,
    fetchedAt: input.fetchedAt,
    segmentCount: input.segmentCount,
    previewSnippet: input.previewSnippet || "Transcript indexed and ready to search.",
    thumbnailUrl: getYouTubeThumbnailUrl(input.videoId),
    relatedTopics,
    relatedCreators,
  };
}

async function getPreviewSegmentsByVideoIds(videoIds: string[]) {
  const supabase = getSupabaseAdminClient();
  if (!supabase || videoIds.length === 0) {
    return new Map<string, IndexedVideoSegment[]>();
  }

  try {
    const { data, error } = await supabase
      .from("transcript_segments")
      .select("video_id, segment_index, text, start_seconds, duration_seconds")
      .in("video_id", videoIds)
      .lte("segment_index", 2)
      .order("segment_index", { ascending: true });

    if (error || !data) {
      return new Map<string, IndexedVideoSegment[]>();
    }

    const grouped = new Map<string, IndexedVideoSegment[]>();
    for (const row of data) {
      const bucket = grouped.get(row.video_id) ?? [];
      bucket.push({
        segmentIndex: row.segment_index,
        text: row.text,
        start: Number(row.start_seconds ?? 0),
        duration: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
      });
      grouped.set(row.video_id, bucket);
    }

    return grouped;
  } catch {
    return new Map<string, IndexedVideoSegment[]>();
  }
}

async function getIndexedFromSupabase(options: {
  limit: number;
  offset: number;
  category?: TranscriptCategorySlug;
}): Promise<IndexedVideosPage | null> {
  const { limit, offset, category } = options;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    let countQuery = supabase.from("transcripts").select("id", { count: "exact", head: true });
    let dataQuery = supabase
      .from("transcripts")
      .select("video_id, video_url, title, channel_name, fetched_at, transcript_segments(count)")
      .order("fetched_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      countQuery = countQuery.eq("category", category);
      dataQuery = dataQuery.eq("category", category);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return null;
    }

    const { data, error } = await dataQuery;

    if (error || !data) {
      return null;
    }

    const videoIds = data.map((row) => row.video_id);
    const previews = await getPreviewSegmentsByVideoIds(videoIds);

    const videos = data.map((row) =>
      enrichIndexedVideo({
        videoId: row.video_id,
        videoUrl: row.video_url ?? getYouTubeWatchUrl(row.video_id),
        title: row.title ?? undefined,
        channelName: row.channel_name ?? undefined,
        fetchedAt: row.fetched_at,
        segmentCount: row.transcript_segments?.[0]?.count ?? 0,
        previewSnippet: buildPreviewSnippet(previews.get(row.video_id) ?? []),
      })
    );

    const total = count ?? videos.length;

    return {
      videos,
      total,
      limit,
      offset,
      hasMore: offset + videos.length < total,
      source: "supabase",
    };
  } catch {
    return null;
  }
}

async function getLatestFromSupabase(limit: number, offset: number): Promise<IndexedVideosPage | null> {
  return getIndexedFromSupabase({ limit, offset });
}

async function getLatestFromFallback(limit: number, offset: number): Promise<IndexedVideosPage> {
  const summaries = await listCachedTranscripts();
  const slice = summaries.slice(offset, offset + limit);

  const videos = await Promise.all(
    slice.map(async (summary) => {
      const cached = await getCachedTranscript(summary.videoId);
      const previewSnippet = buildPreviewSnippet(
        (cached?.segments ?? []).slice(0, 3).map((segment, index) => ({
          segmentIndex: index,
          text: segment.text,
          start: segment.start,
          duration: segment.duration,
        }))
      );

      return enrichIndexedVideo({
        videoId: summary.videoId,
        videoUrl: summary.videoUrl,
        title: summary.title,
        channelName: summary.channelName,
        fetchedAt: summary.fetchedAt,
        segmentCount: summary.segmentCount,
        previewSnippet,
      });
    })
  );

  return {
    videos,
    total: summaries.length,
    limit,
    offset,
    hasMore: offset + videos.length < summaries.length,
    source: "fallback",
  };
}

async function getCategoryFromFallback(
  category: TranscriptCategorySlug,
  limit: number,
  offset: number
): Promise<IndexedVideosPage> {
  const summaries = await listCachedTranscripts();
  const filtered: typeof summaries = [];

  for (const summary of summaries) {
    const cached = await getCachedTranscript(summary.videoId);
    if (cached?.category === category) {
      filtered.push(summary);
    }
  }

  const slice = filtered.slice(offset, offset + limit);
  const videos = await Promise.all(
    slice.map(async (summary) => {
      const cached = await getCachedTranscript(summary.videoId);
      const previewSnippet = buildPreviewSnippet(
        (cached?.segments ?? []).slice(0, 3).map((segment, index) => ({
          segmentIndex: index,
          text: segment.text,
          start: segment.start,
          duration: segment.duration,
        }))
      );

      return enrichIndexedVideo({
        videoId: summary.videoId,
        videoUrl: summary.videoUrl,
        title: summary.title,
        channelName: summary.channelName,
        fetchedAt: summary.fetchedAt,
        segmentCount: summary.segmentCount,
        previewSnippet,
      });
    })
  );

  return {
    videos,
    total: filtered.length,
    limit,
    offset,
    hasMore: offset + videos.length < filtered.length,
    source: "fallback",
  };
}

export async function getIndexedVideosByCategory(
  category: TranscriptCategorySlug,
  limit = DEFAULT_LIMIT,
  offset = 0
): Promise<IndexedVideosPage> {
  if (isSupabaseTranscriptStoreConfigured()) {
    const fromSupabase = await getIndexedFromSupabase({ limit, offset, category });
    if (fromSupabase) {
      return fromSupabase;
    }
  }

  return getCategoryFromFallback(category, limit, offset);
}

export async function getLatestIndexedVideos(
  limit = DEFAULT_LIMIT,
  offset = 0
): Promise<IndexedVideosPage> {
  if (isSupabaseTranscriptStoreConfigured()) {
    const fromSupabase = await getLatestFromSupabase(limit, offset);
    if (fromSupabase) {
      return fromSupabase;
    }
  }

  return getLatestFromFallback(limit, offset);
}

export async function getIndexedVideoById(videoId: string): Promise<IndexedVideo | null> {
  const normalizedId = normalizeVideoId(videoId);

  if (isSupabaseTranscriptStoreConfigured()) {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("transcripts")
          .select(
            "video_id, video_url, title, channel_name, category, topic, creator_name, fetched_at, transcript_segments(count)"
          )
          .eq("video_id", normalizedId)
          .maybeSingle();

        if (!error && data) {
          const segments = await getRecentTranscriptSegments(normalizedId, 3);
          return enrichIndexedVideo({
            videoId: data.video_id,
            videoUrl: data.video_url ?? getYouTubeWatchUrl(data.video_id),
            title: data.title ?? undefined,
            channelName: data.channel_name ?? undefined,
            category: data.category ?? undefined,
            topic: data.topic ?? undefined,
            creatorName: data.creator_name ?? undefined,
            fetchedAt: data.fetched_at,
            segmentCount: data.transcript_segments?.[0]?.count ?? segments.length,
            previewSnippet: buildPreviewSnippet(segments),
          });
        }
      } catch {
        // fall through
      }
    }
  }

  const cached = await getCachedTranscript(normalizedId);
  if (!cached) return null;

  return enrichIndexedVideo({
    videoId: cached.videoId,
    videoUrl: cached.videoUrl,
    title: cached.title,
    channelName: cached.channelName,
    category: cached.category,
    topic: cached.topic,
    creatorName: cached.creatorName,
    fetchedAt: cached.fetchedAt,
    segmentCount: cached.segments.length,
    previewSnippet: buildPreviewSnippet(
      cached.segments.slice(0, 3).map((segment, index) => ({
        segmentIndex: index,
        text: segment.text,
        start: segment.start,
        duration: segment.duration,
      }))
    ),
  });
}

export async function getRecentTranscriptSegments(
  videoId: string,
  limit = 12
): Promise<IndexedVideoSegment[]> {
  const normalizedId = normalizeVideoId(videoId);
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("transcript_segments")
        .select("segment_index, text, start_seconds, duration_seconds")
        .eq("video_id", normalizedId)
        .order("segment_index", { ascending: true })
        .limit(limit);

      if (!error && data) {
        return data.map((row) => ({
          segmentIndex: row.segment_index,
          text: row.text,
          start: Number(row.start_seconds ?? 0),
          duration: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
        }));
      }
    } catch {
      // fall through
    }
  }

  const cached = await getCachedTranscript(normalizedId);
  if (!cached) return [];

  return cached.segments.slice(0, limit).map((segment, index) => ({
    segmentIndex: index,
    text: segment.text,
    start: segment.start,
    duration: segment.duration,
  }));
}

export async function getRelatedIndexedVideos(
  videoId: string,
  limit = 6
): Promise<IndexedVideo[]> {
  const page = await getLatestIndexedVideos(limit + 1, 0);
  return page.videos.filter((video) => video.videoId !== videoId).slice(0, limit);
}
