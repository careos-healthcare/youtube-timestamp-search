import type { Metadata } from "next";

import { formatTopicLabel, getTopicBySlug } from "@/lib/topic-keywords";
import { getCreatorBySlug } from "@/lib/creator-data";
import { getTranscriptCategoryBySlug } from "@/lib/category-data";
import { PRODUCT_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";
import {
  buildMomentOgImageUrl,
  buildPublicMomentOgImageUrl,
  buildSearchOgImageUrl,
  buildVideoOgImageUrl,
} from "@/lib/og-urls";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
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

export function buildPublicMomentPath(id: string, slug: string) {
  return `/moment/${id}/${slug}`;
}

export function buildPublicMomentUrl(id: string, slug: string) {
  return `${getSiteUrl()}${buildPublicMomentPath(id, slug)}`;
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

export function buildMomentsIndexPath() {
  return "/moments";
}

export function buildCollectionsIndexPath() {
  return "/collections";
}

export function buildCollectionPath(slug: string) {
  return `/collections/${encodeURIComponent(slug.toLowerCase())}`;
}

export function createCollectionsIndexMetadata(): Metadata {
  const title = "Research collections — spoken knowledge";
  const description = `${PRODUCT_WEDGE} Curated static collections of transcript-backed moments with source-context labels (heuristic, not fact-checking).`;
  const url = `${getSiteUrl()}${buildCollectionsIndexPath()}`;

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
    robots: { index: true, follow: true },
  };
}

export function createCollectionPageMetadata(input: { title: string; description: string; slug: string }): Metadata {
  const url = `${getSiteUrl()}${buildCollectionPath(input.slug)}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: "website",
      images: ["/og-placeholder.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: ["/og-placeholder.svg"],
    },
    robots: { index: true, follow: true },
  };
}

export function buildCategoryPath(slug: string) {
  return `/category/${encodeURIComponent(slug.toLowerCase())}`;
}

export function buildCategoriesIndexPath() {
  return "/categories";
}

export function createMomentsIndexMetadata(): Metadata {
  const title = "Best searchable video moments";
  const description = `${PRODUCT_WEDGE} Curated transcript-backed moments from the public index — canonical pages with timestamps that open on YouTube.`;
  const url = `${getSiteUrl()}${buildMomentsIndexPath()}`;

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
    robots: { index: true, follow: true },
  };
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
  const ogImage = buildMomentOgImageUrl(videoId, { query: phrase });

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export function createPublicMomentMetadata(row: PublicMomentRecord): Metadata {
  const phrase = normalizeText(row.phrase);
  const videoLabel = row.videoTitle?.trim() || `video ${row.videoId}`;
  const title = `“${phrase}” — ${videoLabel}`;
  const description = `${PRODUCT_WEDGE} Transcript excerpt at ${row.timestamp} in ${videoLabel}. Opens on YouTube at the indexed timestamp.`;
  const url = buildPublicMomentUrl(row.id, row.canonicalSlug);
  const ogImage = buildPublicMomentOgImageUrl(row.id);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export function createSearchMetadata(
  query: string,
  options?: { title?: string; description?: string; noindex?: boolean }
): Metadata {
  const phrase = normalizeText(query);
  const title = options?.title ?? `Search indexed videos for '${phrase}'`;
  const description =
    options?.description ??
    `${PRODUCT_WEDGE} Find exact transcript matches for '${phrase}' across long-form lectures, podcasts, and tutorials.`;
  const url = `${getSiteUrl()}${buildSearchPath(phrase)}`;
  const ogImage = buildSearchOgImageUrl(phrase);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: options?.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Search inside video for ${phrase}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
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
  const image = options?.thumbnailUrl ?? buildVideoOgImageUrl(videoId);

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
