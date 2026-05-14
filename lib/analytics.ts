import { track } from "@vercel/analytics";

export type AnalyticsEventName =
  | "search_submitted"
  | "transcript_load_success"
  | "transcript_load_failed"
  | "transcript_cache_hit"
  | "transcript_cache_miss"
  | "transcript_saved_to_cache"
  | "indexed_transcript_search"
  | "cta_email_submitted"
  | "cta_chrome_extension_clicked"
  | "cta_api_access_clicked"
  | "cta_save_search_clicked";

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

export function trackServerEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics:server]", name, payload);
  }
}
