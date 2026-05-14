export type ReferrerSource =
  | "reddit"
  | "hackernews"
  | "twitter"
  | "google"
  | "direct"
  | "other";

export function classifyReferrer(referrer: string | null | undefined): ReferrerSource {
  if (!referrer || referrer.trim() === "") {
    return "direct";
  }

  const value = referrer.toLowerCase();

  if (value.includes("reddit.com")) return "reddit";
  if (value.includes("news.ycombinator.com") || value.includes("hn.algolia.com")) return "hackernews";
  if (
    value.includes("twitter.com") ||
    value.includes("x.com") ||
    value.includes("t.co")
  ) {
    return "twitter";
  }
  if (value.includes("google.")) return "google";

  return "other";
}

export const REFERRER_LABELS: Record<ReferrerSource, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  twitter: "Twitter / X",
  google: "Google",
  direct: "Direct",
  other: "Other",
};
