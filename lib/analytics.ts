import { track } from "@vercel/analytics";

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
  | "search_dwell";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("youtube-timestamp-search:analytics", {
        detail: { name, payload },
      })
    );

    track(name, payload);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", name, payload);
  }
}

export function trackPersistentEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  trackEvent(name, payload);

  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    event: name,
    query: typeof payload.query === "string" ? payload.query : undefined,
    videoId: typeof payload.videoId === "string" ? payload.videoId : undefined,
    payload,
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
