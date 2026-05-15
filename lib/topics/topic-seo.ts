import type { Metadata } from "next";

import type { TopicHub } from "@/lib/topics/topic-hub-types";
import { buildTopicPath, getSiteUrl } from "@/lib/seo";

export function createTopicIntelligenceMetadata(hub: TopicHub): Metadata {
  const url = `${getSiteUrl()}${buildTopicPath(hub.slug)}`;
  const title = `${hub.displayTitle} — transcript moments & videos`;
  const thin = hub.quality === "thin";
  return {
    title,
    description: hub.description,
    alternates: { canonical: url },
    robots: thin ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description: hub.description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: hub.description,
      images: ["/og-placeholder.svg"],
    },
  };
}
