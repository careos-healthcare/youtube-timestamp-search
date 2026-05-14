import type { Metadata } from "next";

import { formatTopicLabel, getTopicBySlug } from "@/lib/topic-keywords";
import { getCreatorBySlug } from "@/lib/creator-data";
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

export function createLatestMetadata(page = 1): Metadata {
  const title =
    page > 1
      ? `Latest searchable YouTube transcripts — page ${page}`
      : "Latest searchable YouTube transcripts";
  const description =
    "Browse the newest indexed YouTube transcript videos. Search captions, jump to timestamps, and explore related topics and creators.";
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
  const title = `Find '${phrase}' in YouTube transcript`;
  const description = `Search YouTube transcript timestamps for '${phrase}' in video ${videoId}. Jump to exact moments instantly.`;
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
  const title = `Search YouTube transcripts for '${phrase}'`;
  const description = `Find exact YouTube transcript timestamps for '${phrase}'. Search podcasts, interviews, lectures, and tutorials instantly.`;
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
  options?: { title?: string; channelName?: string }
): Metadata {
  const label = options?.title ?? `video ${videoId}`;
  const channelSuffix = options?.channelName ? ` from ${options.channelName}` : "";
  const title = `Search transcript for ${label}`;
  const description = options?.title
    ? `Search the YouTube transcript for "${options.title}"${channelSuffix}. Find exact timestamps without scrubbing.`
    : `Search the YouTube transcript for video ${videoId}. Find exact timestamps without scrubbing.`;
  const url = `${getSiteUrl()}${buildVideoPath(videoId)}`;

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
