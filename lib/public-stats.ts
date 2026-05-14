import { getLatestIndexedVideos } from "@/lib/indexed-videos";
import { getContentMoatMetrics } from "@/lib/content-moat";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";

export type PublicStatsTopic = {
  query: string;
  count: number;
};

export type PublicStatsVideo = {
  videoId: string;
  title: string;
  channelName?: string;
  fetchedAt: string;
};

export type PublicStats = {
  generatedAt: string;
  indexedVideos: number;
  searchableSegments: number;
  estimatedIndexedHours: number;
  searchesPerformed: number;
  mostSearchedTopics: PublicStatsTopic[];
  newestIndexedVideos: PublicStatsVideo[];
};

async function getMostSearchedTopics(limit = 12): Promise<PublicStatsTopic[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return PRIORITY_SEARCH_QUERIES.slice(0, limit).map((seed, index) => ({
      query: seed.phrase,
      count: PRIORITY_SEARCH_QUERIES.length - index,
    }));
  }

  const { data } = await supabase
    .from("search_analytics_events")
    .select("query")
    .not("query", "is", null)
    .in("event_name", [
      "search_query",
      "homepage_search",
      "search_submitted",
      "indexed_transcript_search",
    ])
    .order("created_at", { ascending: false })
    .limit(3000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const query = row.query?.trim();
    if (!query) continue;
    counts.set(query, (counts.get(query) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return PRIORITY_SEARCH_QUERIES.slice(0, limit).map((seed, index) => ({
      query: seed.phrase,
      count: PRIORITY_SEARCH_QUERIES.length - index,
    }));
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }));
}

export async function getPublicStats(): Promise<PublicStats> {
  const [moat, latestPage] = await Promise.all([
    getContentMoatMetrics(),
    getLatestIndexedVideos(8, 0),
  ]);

  return {
    generatedAt: moat.generatedAt,
    indexedVideos: moat.indexedVideos,
    searchableSegments: moat.searchableSegments,
    estimatedIndexedHours: moat.estimatedIndexedHours,
    searchesPerformed: moat.totalSearchEvents,
    mostSearchedTopics: await getMostSearchedTopics(),
    newestIndexedVideos: latestPage.videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      channelName: video.channelName,
      fetchedAt: video.fetchedAt,
    })),
  };
}
