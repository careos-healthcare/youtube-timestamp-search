import { track } from "@vercel/analytics";

export type AnalyticsEventName =
  | "searches"
  | "successful_results"
  | "transcript_failures"
  | "result_clicks";

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
    console.debug("[analytics-placeholder]", name, payload);
  }
}
