"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

type SearchQueryTrackerProps = {
  query: string;
  resultCount: number;
};

export function SearchQueryTracker({ query, resultCount }: SearchQueryTrackerProps) {
  useEffect(() => {
    trackPersistentEvent("search_query", { query, resultCount });
    if (resultCount === 0) {
      trackPersistentEvent("search_zero_results", { query });
    }
  }, [query, resultCount]);

  return null;
}
