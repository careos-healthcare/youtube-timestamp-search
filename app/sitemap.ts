import type { MetadataRoute } from "next";

import { getSiteUrl, buildTopicPath, buildCreatorPath } from "@/lib/seo";
import { TOPIC_KEYWORDS } from "@/lib/topic-keywords";
import { CREATOR_SLUGS } from "@/lib/creator-data";

const STATIC_PAGES = [
  "/",
  "/topics",
  "/creators",
  "/transcripts",
  "/find-youtube-quotes",
  "/search-podcast-transcripts",
  "/find-youtube-timestamps",
  "/search-youtube-captions",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const staticEntries = STATIC_PAGES.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));

  const topicEntries = TOPIC_KEYWORDS.map((keyword) => ({
    url: `${siteUrl}${buildTopicPath(keyword)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const creatorEntries = CREATOR_SLUGS.map((slug) => ({
    url: `${siteUrl}${buildCreatorPath(slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticEntries, ...topicEntries, ...creatorEntries];
}
