import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

const STATIC_PAGES = [
  "/",
  "/find-youtube-quotes",
  "/search-podcast-transcripts",
  "/find-youtube-timestamps",
  "/search-youtube-captions",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return STATIC_PAGES.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));
}
