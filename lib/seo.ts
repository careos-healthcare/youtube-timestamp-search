import type { Metadata } from "next";

import { formatTopicLabel, getTopicBySlug } from "@/lib/topic-keywords";
import { getCreatorBySlug } from "@/lib/creator-data";
import { getTranscriptCategoryBySlug } from "@/lib/category-data";
import { PRODUCT_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";
import { normalizeText } from "@/lib/youtube";

export const PRODUCTION_SITE_URL = "https://www.youtubetimesearch.com";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return PRODUCTION_SITE_URL;
}

export function slugifyQuery(query: string) {
  return encodeURIComponent(
    normalizeText(query)
      .toLowerCase()
      .replace(/\s+/g, "-")
  );
}

export function deslugifyQuery(slug: string) {
  try {
    return decodeURIComponent(slug).replace(/-/g, " ");
  } catch {
    return slug.replace(/-/g, " ");
  }
}

export function buildMomentPath(videoId: string, query: string) {
  return `/video/${videoId}/moment/${slugifyQuery(query)}`;
}

export function buildMomentUrl(videoId: string, query: string) {
  return `${getSiteUrl()}${buildMomentPath(videoId, query)}`;
}

export function buildSearchPath(query: string) {
  return `/search/${slugifyQuery(query)}`;
}

export function buildVideoPath(videoId: string) {
  return `/video/${videoId}`;
}

export function buildTopicPath(keyword: string) {
  return `/topic/${encodeURIComponent(keyword.toLowerCase())}`;
}

export function buildTopicsIndexPath() {
  return "/topics";
}

export function buildCreatorPath(slug: string) {
  return `/creator/${encodeURIComponent(slug.toLowerCase())}`;
}

export function buildCreatorsIndexPath() {
  return "/creators";
}

export function buildTranscriptsIndexPath() {
  return "/transcripts";
}

export function buildLatestPath(page = 1) {
  return page > 1 ? `/latest?page=${page}` : "/latest";
}

export function buildCategoryPath(slug: string) {
  return `/category/${encodeURIComponent(slug.toLowerCase())}`;
}

export function buildCategoriesIndexPath() {
  return "/categories";
}

export function createLatestMetadata(page = 1): Metadata {
  const title =
    page > 1
      ? `Latest searchable YouTube transcripts — page ${page}`
      : "Latest searchable YouTube transcripts";
  const description =
    "Browse the newest long-form videos in the public knowledge index. Search inside each transcript and jump to exact useful moments.";
  const url = `${getSiteUrl()}${buildLatestPath(page)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createCategoryMetadata(slug: string): Metadata {
  const category = getTranscriptCategoryBySlug(slug);
  if (!category) return {};

  const title = `${category.label} — searchable long-form videos`;
  const description = `${category.description} ${PRODUCT_WEDGE}`;
  const url = `${getSiteUrl()}${buildCategoryPath(category.slug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createCategoriesIndexMetadata(): Metadata {
  const title = "Browse searchable video categories";
  const description =
    "Discover indexed long-form YouTube videos by subject — programming, AI, business, finance, and self-improvement. Search inside each video for exact moments.";
  const url = `${getSiteUrl()}${buildCategoriesIndexPath()}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createCreatorMetadata(slug: string): Metadata {
  const creator = getCreatorBySlug(slug);
  if (!creator) return {};

  const title = `${creator.displayName} transcript search — find timestamps & quotes`;
  const description = creator.description;
  const canonicalSlug = creator.slug;
  const url = `${getSiteUrl()}${buildCreatorPath(canonicalSlug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createTopicMetadata(keyword: string): Metadata {
  const topic = getTopicBySlug(keyword);
  const label = topic?.displayName ?? formatTopicLabel(keyword);
  const title = `Search YouTube transcripts for ${label.toLowerCase()} moments`;
  const description =
    topic?.description ??
    `Find ${label.toLowerCase()} quotes, podcast moments, and timestamps inside YouTube transcripts.`;
  const canonicalSlug = topic?.slug ?? keyword.toLowerCase();
  const url = `${getSiteUrl()}${buildTopicPath(canonicalSlug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createMomentMetadata(videoId: string, query: string): Metadata {
  const phrase = normalizeText(query);
  const title = `Find '${phrase}' inside this video`;
  const description = `${PRODUCT_WEDGE} Search the transcript for '${phrase}' in video ${videoId} and open the exact timestamp.`;
  const url = buildMomentUrl(videoId, phrase);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createSearchMetadata(query: string): Metadata {
  const phrase = normalizeText(query);
  const title = `Search indexed videos for '${phrase}'`;
  const description = `${PRODUCT_WEDGE} Find exact transcript matches for '${phrase}' across long-form lectures, podcasts, and tutorials.`;
  const url = `${getSiteUrl()}${buildSearchPath(phrase)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-placeholder.svg"],
    },
  };
}

export function createVideoMetadata(
  videoId: string,
  options?: {
    title?: string;
    channelName?: string;
    description?: string;
    thumbnailUrl?: string;
    segmentCount?: number;
  }
): Metadata {
  const channelSuffix = options?.channelName ? ` from ${options.channelName}` : "";
  const title = options?.title
    ? `Search inside: ${options.title}`
    : `Search inside video ${videoId}`;
  const description =
    options?.description ??
    (options?.title
      ? `${PRODUCT_WEDGE} Search the indexed transcript for "${options.title}"${channelSuffix}. Jump to searchable moments without scrubbing.`
      : `${PRODUCT_DESCRIPTION} Video ${videoId}.`);
  const url = `${getSiteUrl()}${buildVideoPath(videoId)}`;
  const image = options?.thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "video.other",
      images: [
        {
          url: image,
          width: 1280,
          height: 720,
          alt: options?.title ?? `YouTube video ${videoId}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: options?.segmentCount
      ? {
          "video:duration": String(options.segmentCount),
        }
      : undefined,
  };
}
