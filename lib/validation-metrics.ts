import { getSupabaseAdminClient } from "@/lib/supabase";
import { getTranscriptCacheMode, listCachedTranscripts } from "@/lib/transcript-cache";

export type ValidationRankedQuery = {
  query: string;
  count: number;
};

export type ValidationRankedVideo = {
  videoId: string;
  count: number;
};

export type ValidationAnalyticsSnapshot = {
  totalSearchEvents: number;
  zeroResultSearches: number;
  youtubeTimestampClicks: number;
  feedbackYes: number;
  feedbackNo: number;
  topQueries: ValidationRankedQuery[];
  topVideos: ValidationRankedVideo[];
  source: "supabase_rpc" | "supabase_fallback" | "unavailable";
};

export type ValidationMetrics = {
  generatedAt: string;
  cacheMode: string;
  indexedVideos: number;
  searchableSegments: number;
  analytics: ValidationAnalyticsSnapshot;
};

const EMPTY_ANALYTICS: ValidationAnalyticsSnapshot = {
  totalSearchEvents: 0,
  zeroResultSearches: 0,
  youtubeTimestampClicks: 0,
  feedbackYes: 0,
  feedbackNo: 0,
  topQueries: [],
  topVideos: [],
  source: "unavailable",
};

const SEARCH_EVENT_NAMES = [
  "search_query",
  "homepage_search",
  "search_submitted",
  "indexed_transcript_search",
] as const;

const ZERO_RESULT_EVENT_NAMES = ["search_zero_results", "no_results"] as const;

const YOUTUBE_CLICK_EVENT_NAMES = [
  "youtube_timestamp_click",
  "youtube_open",
  "result_click",
  "search_result_click",
] as const;

function parseRpcMetrics(data: unknown): ValidationAnalyticsSnapshot {
  const row = data as Record<string, unknown>;

  return {
    totalSearchEvents: Number(row.total_search_events ?? 0),
    zeroResultSearches: Number(row.zero_result_searches ?? 0),
    youtubeTimestampClicks: Number(row.youtube_timestamp_clicks ?? 0),
    feedbackYes: Number(row.feedback_yes ?? 0),
    feedbackNo: Number(row.feedback_no ?? 0),
    topQueries: Array.isArray(row.top_queries)
      ? row.top_queries.map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            query: String(entry.query ?? ""),
            count: Number(entry.count ?? 0),
          };
        })
      : [],
    topVideos: Array.isArray(row.top_videos)
      ? row.top_videos.map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            videoId: String(entry.videoId ?? entry.video_id ?? ""),
            count: Number(entry.count ?? 0),
          };
        })
      : [],
    source: "supabase_rpc",
  };
}

async function countEventsByNames(eventNames: readonly string[]) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("search_analytics_events")
    .select("*", { count: "exact", head: true })
    .in("event_name", [...eventNames]);

  if (error) return 0;
  return count ?? 0;
}

async function countFeedback(helpful: boolean) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("search_analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "result_feedback")
    .eq("payload->>helpful", helpful ? "true" : "false");

  if (error) return 0;
  return count ?? 0;
}

async function fetchFallbackAnalytics(): Promise<ValidationAnalyticsSnapshot> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return EMPTY_ANALYTICS;

  const [totalSearchEvents, zeroResultSearches, youtubeTimestampClicks, feedbackYes, feedbackNo] =
    await Promise.all([
      countEventsByNames(SEARCH_EVENT_NAMES),
      countEventsByNames(ZERO_RESULT_EVENT_NAMES),
      countEventsByNames(YOUTUBE_CLICK_EVENT_NAMES),
      countFeedback(true),
      countFeedback(false),
    ]);

  const { data: queryRows } = await supabase
    .from("search_analytics_events")
    .select("query")
    .not("query", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  const queryCounts = new Map<string, number>();
  for (const row of queryRows ?? []) {
    const query = row.query?.trim();
    if (!query) continue;
    queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
  }

  const { data: videoRows } = await supabase
    .from("search_analytics_events")
    .select("video_id, event_name")
    .not("video_id", "is", null)
    .in("event_name", [...YOUTUBE_CLICK_EVENT_NAMES])
    .order("created_at", { ascending: false })
    .limit(5000);

  const videoCounts = new Map<string, number>();
  for (const row of videoRows ?? []) {
    const videoId = row.video_id?.trim();
    if (!videoId) continue;
    videoCounts.set(videoId, (videoCounts.get(videoId) ?? 0) + 1);
  }

  return {
    totalSearchEvents,
    zeroResultSearches,
    youtubeTimestampClicks,
    feedbackYes,
    feedbackNo,
    topQueries: [...queryCounts.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
    topVideos: [...videoCounts.entries()]
      .map(([videoId, count]) => ({ videoId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
    source: "supabase_fallback",
  };
}

async function fetchAnalyticsSnapshot(): Promise<ValidationAnalyticsSnapshot> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return EMPTY_ANALYTICS;

  const { data, error } = await supabase.rpc("validation_dashboard_metrics");
  if (!error && data) {
    return parseRpcMetrics(data);
  }

  return fetchFallbackAnalytics();
}

export async function getValidationMetrics(): Promise<ValidationMetrics> {
  const transcripts = await listCachedTranscripts();

  return {
    generatedAt: new Date().toISOString(),
    cacheMode: getTranscriptCacheMode(),
    indexedVideos: transcripts.length,
    searchableSegments: transcripts.reduce((sum, transcript) => sum + transcript.segmentCount, 0),
    analytics: await fetchAnalyticsSnapshot(),
  };
}
