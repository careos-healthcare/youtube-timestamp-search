import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

export type TopicHubQuality = "hub" | "thin";

export type TopicHubVideo = {
  videoId: string;
  title: string;
  channelName?: string;
  momentCount: number;
  bestScore: number;
};

export type TopicHubCreator = {
  slug: string;
  displayName: string;
};

export type TopicHub = {
  slug: string;
  displayTitle: string;
  description: string;
  quality: TopicHubQuality;
  /** Indexed transcript category slug when known. */
  categorySlug?: string;
  moments: PublicMomentRecord[];
  videos: TopicHubVideo[];
  creators: TopicHubCreator[];
  relatedTopicSlugs: string[];
  relatedSearches: string[];
  /** For analytics + UI grouping. */
  pillar: TopicPillar;
};

export type TopicPillar = "ai" | "coding" | "startups" | "productivity" | "education" | "other";

export type TopicIndexBuildStats = {
  hubCount: number;
  thinCount: number;
  rejectedWeakLabels: string[];
};
