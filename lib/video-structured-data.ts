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

export function buildVideoStructuredData(
  input: VideoStructuredDataInput,
  options?: { discussedTopics?: string[] }
) {
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
            name: "Video index",
            item: `${getSiteUrl()}/transcripts`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.title,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: `How do I search inside "${input.title}"?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Use the search box on this page to find exact phrases in the transcript and jump to timestamps on YouTube.",
            },
          },
          {
            "@type": "Question",
            name: `What topics are discussed in this video?`,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                options?.discussedTopics?.length
                  ? `Key topics include ${options.discussedTopics.slice(0, 8).join(", ")}.`
                  : "Browse searchable moments and transcript sections on this page to explore topics.",
            },
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
