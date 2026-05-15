import type { MetadataRoute } from "next";

import { listAllIndexedVideoIds } from "@/lib/indexed-videos";
import { buildMomentSitemapEntries } from "@/lib/moment-sitemap";
import { SITEMAP_INCLUDE_MOMENTS } from "@/lib/sitemap-config";
import { SEARCH_QUERY_SLUGS, phraseFromSearchSlug } from "@/lib/search-query-seeds";
import {
  buildCategoryPath,
  buildCreatorPath,
  buildPublicMomentPath,
  buildSearchPath,
  buildTopicPath,
  buildTranscriptsIndexPath,
  buildVideoPath,
  getSiteUrl,
} from "@/lib/seo";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import { TOPIC_KEYWORDS } from "@/lib/topic-keywords";
import { CREATOR_SLUGS } from "@/lib/creator-data";
import { TRANSCRIPT_CATEGORY_SLUGS } from "@/lib/category-data";

const isNpmBuild = typeof process !== "undefined" && process.env.npm_lifecycle_event === "build";

const STATIC_PAGES = [
  "/",
  "/latest",
  "/topics",
  "/creators",
  "/categories",
  "/transcripts",
  "/find-youtube-quotes",
  "/search-podcast-transcripts",
  "/find-youtube-timestamps",
  "/search-youtube-captions",
  "/stats",
  "/trending",
];

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries = STATIC_PAGES.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path === "/transcripts" ? 0.9 : 0.8,
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
    priority: 0.65,
  }));

  const categoryEntries = TRANSCRIPT_CATEGORY_SLUGS.map((slug) => ({
    url: `${siteUrl}${buildCategoryPath(slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const searchEntries = SEARCH_QUERY_SLUGS.map((slug) => ({
    url: `${siteUrl}${buildSearchPath(phraseFromSearchSlug(slug))}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.88,
  }));

  const videoIdLimit = isNpmBuild ? 350 : 2000;
  const videoIds = await listAllIndexedVideoIds(videoIdLimit);
  const videoEntries = videoIds.map((videoId) => ({
    url: `${siteUrl}${buildVideoPath(videoId)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.82,
  }));

  const momentEntries =
    SITEMAP_INCLUDE_MOMENTS && !isNpmBuild
      ? (await buildMomentSitemapEntries()).map((entry) => ({
          url: `${siteUrl}${entry.path}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.75,
        }))
      : [];

  const transcriptIndexEntry = {
    url: `${siteUrl}${buildTranscriptsIndexPath()}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  };

  const publicMomentEntries = loadPublicMoments().map((m) => ({
    url: `${siteUrl}${buildPublicMomentPath(m.id, m.canonicalSlug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.74,
  }));

  return [
    ...staticEntries.filter((entry) => !entry.url.endsWith("/transcripts")),
    transcriptIndexEntry,
    ...searchEntries,
    ...videoEntries,
    ...momentEntries,
    ...publicMomentEntries,
    ...categoryEntries,
    ...topicEntries,
    ...creatorEntries,
  ];
}
