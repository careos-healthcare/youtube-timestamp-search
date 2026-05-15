const FIRST_SEARCH_QUERY_KEY = "youtube-timestamp-search:first-search-query";

export type AnalyticsContextPayload = Record<string, string | number | boolean | null | undefined>;

/** Persist the first non-empty search query of the browser session (sessionStorage). */
export function recordFirstSearchQuery(query: string): void {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    if (!window.sessionStorage.getItem(FIRST_SEARCH_QUERY_KEY)) {
      window.sessionStorage.setItem(FIRST_SEARCH_QUERY_KEY, trimmed);
    }
  } catch {
    // storage unavailable (private mode, quota, etc.)
  }
}

function readFirstSearchQuery(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = window.sessionStorage.getItem(FIRST_SEARCH_QUERY_KEY);
    const t = v?.trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

/** Attach session-scoped analytics dimensions (client-only). */
export function mergeAnalyticsContext(payload: AnalyticsContextPayload): AnalyticsContextPayload {
  if (typeof window === "undefined") {
    return { ...payload };
  }
  const first = readFirstSearchQuery();
  if (!first || payload.firstSearchQuery != null) {
    return { ...payload };
  }
  return { ...payload, firstSearchQuery: first };
}
