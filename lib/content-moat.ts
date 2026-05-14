import { CREATOR_SLUGS } from "@/lib/creator-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { TOPIC_KEYWORDS } from "@/lib/topic-keywords";
import { getTranscriptCacheMode, listCachedTranscripts } from "@/lib/transcript-cache";
import { SEARCH_QUERY_SLUGS } from "@/lib/search-query-seeds";

const AVERAGE_SEGMENT_SECONDS = 4;

export type ContentMoatMetrics = {
  generatedAt: string;
  cacheMode: string;
  indexedVideos: number;
  searchableSegments: number;
  estimatedIndexedHours: number;
  topicCoverage: number;
  creatorCoverage: number;
  prioritySearchRoutes: number;
  uniqueSearchablePhrases: number;
  totalSearchEvents: number;
  searchGrowthLast7Days: number;
};

async function countSearchEvents() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { total: 0, last7Days: 0 };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: total }, { count: last7Days }] = await Promise.all([
    supabase
      .from("search_analytics_events")
      .select("*", { count: "exact", head: true })
      .in("event_name", [
        "search_query",
        "homepage_search",
        "search_submitted",
        "indexed_transcript_search",
      ]),
    supabase
      .from("search_analytics_events")
      .select("*", { count: "exact", head: true })
      .in("event_name", [
        "search_query",
        "homepage_search",
        "search_submitted",
        "indexed_transcript_search",
      ])
      .gte("created_at", weekAgo),
  ]);

  return { total: total ?? 0, last7Days: last7Days ?? 0 };
}

async function countUniqueSearchPhrases() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return SEARCH_QUERY_SLUGS.length + TOPIC_KEYWORDS.length;
  }

  const { data } = await supabase
    .from("search_analytics_events")
    .select("query")
    .not("query", "is", null)
    .limit(5000);

  const unique = new Set<string>();
  for (const row of data ?? []) {
    const query = row.query?.trim().toLowerCase();
    if (query) unique.add(query);
  }

  return unique.size + SEARCH_QUERY_SLUGS.length;
}

export async function getContentMoatMetrics(): Promise<ContentMoatMetrics> {
  const transcripts = await listCachedTranscripts();
  const searchableSegments = transcripts.reduce((sum, item) => sum + item.segmentCount, 0);
  const searchCounts = await countSearchEvents();

  return {
    generatedAt: new Date().toISOString(),
    cacheMode: getTranscriptCacheMode(),
    indexedVideos: transcripts.length,
    searchableSegments,
    estimatedIndexedHours: Number(((searchableSegments * AVERAGE_SEGMENT_SECONDS) / 3600).toFixed(1)),
    topicCoverage: TOPIC_KEYWORDS.length,
    creatorCoverage: CREATOR_SLUGS.length,
    prioritySearchRoutes: SEARCH_QUERY_SLUGS.length,
    uniqueSearchablePhrases: await countUniqueSearchPhrases(),
    totalSearchEvents: searchCounts.total,
    searchGrowthLast7Days: searchCounts.last7Days,
  };
}

export function formatContentMoatReport(metrics: ContentMoatMetrics) {
  return `# Content moat report

Generated: ${metrics.generatedAt}

## Corpus depth

| Metric | Value |
|--------|------:|
| Indexed videos | ${metrics.indexedVideos} |
| Searchable segments | ${metrics.searchableSegments} |
| Estimated indexed hours | ${metrics.estimatedIndexedHours} |
| Topic coverage | ${metrics.topicCoverage} topic pages |
| Creator coverage | ${metrics.creatorCoverage} creator pages |
| Priority search routes | ${metrics.prioritySearchRoutes} |
| Unique searchable phrases | ${metrics.uniqueSearchablePhrases} |

## Demand signal

| Metric | Value |
|--------|------:|
| Total search events | ${metrics.totalSearchEvents} |
| Search events (last 7 days) | ${metrics.searchGrowthLast7Days} |
| Cache mode | ${metrics.cacheMode} |

## Regenerate

\`\`\`bash
npm run refresh:index
\`\`\`
`;
}
