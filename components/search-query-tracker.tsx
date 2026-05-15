"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { recordFirstSearchQuery } from "@/lib/analytics-context";
import { recordRecentSearch } from "@/lib/growth/recent-searches";
import { incrementSessionSearches, tryMarkMilestoneOnce } from "@/lib/growth/session-metrics";

type SearchQueryTrackerProps = {
  query: string;
  resultCount: number;
};

export function SearchQueryTracker({ query, resultCount }: SearchQueryTrackerProps) {
  useEffect(() => {
    recordRecentSearch(query);
    const depth = incrementSessionSearches();

    trackPersistentEvent("search_query", { query, resultCount });
    recordFirstSearchQuery(query);
    if (resultCount === 0) {
      trackPersistentEvent("search_zero_results", { query });
    }

    for (const n of [1, 2, 3, 5] as const) {
      if (depth === n && tryMarkMilestoneOnce(`session_searches_${n}`)) {
        trackPersistentEvent("search_depth_milestone", {
          milestone: `searches_${n}`,
          depth: n,
          query,
          resultCount,
        });
      }
    }
  }, [query, resultCount]);

  return null;
}
