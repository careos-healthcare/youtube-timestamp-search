import { getSupabaseAdminClient } from "@/lib/supabase";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { buildSearchPath } from "@/lib/seo";
import { AUTHORITY_TOPIC_SLUGS } from "@/lib/topic-cluster-engine";
import { formatTopicLabel } from "@/lib/topic-keywords";

export type TrendingSearchItem = {
  query: string;
  href: string;
  count: number;
  label?: string;
};

export type TrendingSearchesData = {
  trending: TrendingSearchItem[];
  newestTopics: TrendingSearchItem[];
  fastestGrowing: TrendingSearchItem[];
  source: "analytics" | "seed-fallback";
};

function seedTrending(): TrendingSearchItem[] {
  return PRIORITY_SEARCH_QUERIES.slice(0, 8).map((seed, index) => ({
    query: seed.phrase,
    href: buildSearchPath(seed.phrase),
    count: PRIORITY_SEARCH_QUERIES.length - index,
    label: seed.title,
  }));
}

function seedTopics(): TrendingSearchItem[] {
  return AUTHORITY_TOPIC_SLUGS.slice(0, 6).map((slug, index) => ({
    query: formatTopicLabel(slug),
    href: `/topic/${slug}`,
    count: AUTHORITY_TOPIC_SLUGS.length - index,
  }));
}

async function loadAnalyticsCounts() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recent }, { data: prior }] = await Promise.all([
    supabase
      .from("search_analytics_events")
      .select("query, created_at")
      .not("query", "is", null)
      .in("event_name", ["search_query", "homepage_search", "search_submitted", "indexed_transcript_search"])
      .gte("created_at", weekAgo)
      .limit(3000),
    supabase
      .from("search_analytics_events")
      .select("query, created_at")
      .not("query", "is", null)
      .in("event_name", ["search_query", "homepage_search", "search_submitted", "indexed_transcript_search"])
      .gte("created_at", monthAgo)
      .lt("created_at", weekAgo)
      .limit(3000),
  ]);

  if (!recent?.length) return null;

  const recentCounts = new Map<string, number>();
  const priorCounts = new Map<string, number>();

  for (const row of recent) {
    const query = row.query?.trim();
    if (!query) continue;
    recentCounts.set(query, (recentCounts.get(query) ?? 0) + 1);
  }

  for (const row of prior ?? []) {
    const query = row.query?.trim();
    if (!query) continue;
    priorCounts.set(query, (priorCounts.get(query) ?? 0) + 1);
  }

  return { recentCounts, priorCounts };
}

export async function getTrendingSearches(): Promise<TrendingSearchesData> {
  if (typeof process !== "undefined" && process.env.npm_lifecycle_event === "build") {
    const trending = seedTrending();
    return {
      trending,
      newestTopics: seedTopics(),
      fastestGrowing: trending.slice(0, 5),
      source: "seed-fallback",
    };
  }

  const analytics = await loadAnalyticsCounts();

  if (!analytics) {
    const trending = seedTrending();
    return {
      trending,
      newestTopics: seedTopics(),
      fastestGrowing: trending.slice(0, 5),
      source: "seed-fallback",
    };
  }

  const trending = [...analytics.recentCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([query, count]) => ({
      query,
      href: buildSearchPath(query),
      count,
    }));

  const fastestGrowing = [...analytics.recentCounts.entries()]
    .map(([query, recentCount]) => {
      const prior = analytics.priorCounts.get(query) ?? 0;
      const growth = recentCount - prior;
      return { query, recentCount, growth };
    })
    .sort((left, right) => right.growth - left.growth || right.recentCount - left.recentCount)
    .slice(0, 6)
    .map((item) => ({
      query: item.query,
      href: buildSearchPath(item.query),
      count: item.growth > 0 ? item.growth : item.recentCount,
    }));

  return {
    trending: trending.length > 0 ? trending : seedTrending(),
    newestTopics: seedTopics(),
    fastestGrowing: fastestGrowing.length > 0 ? fastestGrowing : seedTrending().slice(0, 5),
    source: "analytics",
  };
}
