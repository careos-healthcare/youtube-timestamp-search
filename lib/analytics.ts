import { mergeAnalyticsContext } from "@/lib/analytics-context";

export type AnalyticsEventName =
  | "homepage_search"
  | "paste_url_submit"
  | "result_click"
  | "youtube_timestamp_click"
  | "no_results"
  | "search_query"
  | "search_result_click"
  | "search_zero_results"
  | "youtube_open"
  | "search_submitted"
  | "transcript_load_success"
  | "transcript_load_failed"
  | "transcript_cache_hit"
  | "transcript_cache_miss"
  | "transcript_saved_to_cache"
  | "indexed_transcript_search"
  | "latest_video_click"
  | "latest_video_open"
  | "indexed_video_impression"
  | "cta_email_submitted"
  | "cta_chrome_extension_clicked"
  | "cta_api_access_clicked"
  | "cta_save_search_clicked"
  | "video_within_search_submitted"
  | "result_feedback"
  | "referrer_visit"
  | "extension_video_search"
  | "extension_index_request"
  | "search_reformulation"
  | "search_pogo_stick"
  | "search_abandon"
  | "search_answer_success"
  | "search_dwell"
  | "link_copy"
  | "search_native_share"
  | "recent_search_click"
  | "continue_exploring_click"
  | "search_depth_milestone"
  | "saved_clip"
  | "email_capture_prompt_shown"
  | "email_capture_submit"
  | "empty_search_recovered";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const merged = mergeAnalyticsContext(payload);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("youtube-timestamp-search:analytics", {
        detail: { name, payload: merged },
      })
    );

    void import("@vercel/analytics")
      .then(({ track }) =>
        track(name, merged as Record<string, string | number | boolean | null>)
      )
      .catch(() => {
        // non-blocking; avoid failing UX if analytics chunk is unavailable
      });
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", name, merged);
  }
}

export function trackPersistentEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  trackEvent(name, payload);

  if (typeof window === "undefined") {
    return;
  }

  const merged = mergeAnalyticsContext(payload);

  const body = JSON.stringify({
    event: name,
    query: typeof merged.query === "string" ? merged.query : undefined,
    videoId: typeof merged.videoId === "string" ? merged.videoId : undefined,
    payload: merged,
  });

  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/event", blob);
    } else {
      void fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // non-blocking
  }
}

export function trackServerEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics:server]", name, payload);
  }
}
