import type { TranscriptCategorySlug } from "@/lib/category-data";
import { getSiteUrl, buildVideoPath } from "@/lib/seo";
import { getYouTubeThumbnailUrl } from "@/lib/indexed-videos";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type VideoStructuredDataInput = {
  videoId: string;
  title: string;
  description: string;
  channelName?: string;
  fetchedAt?: string;
  segmentCount?: number;
  categoryLabel?: string;
};

export function buildVideoStructuredData(input: VideoStructuredDataInput) {
  const pageUrl = `${getSiteUrl()}${buildVideoPath(input.videoId)}`;
  const thumbnailUrl = getYouTubeThumbnailUrl(input.videoId);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.title,
        description: input.description,
        isPartOf: {
          "@type": "WebSite",
          name: "YouTube Time Search",
          url: getSiteUrl(),
        },
      },
      {
        "@type": "VideoObject",
        "@id": `${pageUrl}#video`,
        name: input.title,
        description: input.description,
        thumbnailUrl,
        embedUrl: getYouTubeWatchUrl(input.videoId),
        contentUrl: getYouTubeWatchUrl(input.videoId),
        uploadDate: input.fetchedAt,
        ...(input.channelName
          ? {
              author: {
                "@type": "Person",
                name: input.channelName,
              },
            }
          : {}),
        ...(input.segmentCount != null
          ? {
              interactionStatistic: {
                "@type": "InteractionCounter",
                interactionType: { "@type": "WatchAction" },
                userInteractionCount: input.segmentCount,
              },
            }
          : {}),
        ...(input.categoryLabel
          ? {
              genre: input.categoryLabel,
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: getSiteUrl(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Latest videos",
            item: `${getSiteUrl()}/latest`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.title,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

export function getCategoryLabelForSlug(slug: string): string | undefined {
  const labels: Record<TranscriptCategorySlug, string> = {
    "programming-tutorials": "Programming tutorials",
    "ai-podcasts": "AI podcasts",
    "business-interviews": "Business interviews",
    "finance-education": "Finance education",
    "self-improvement": "Self-improvement",
  };

  return labels[slug as TranscriptCategorySlug];
}
