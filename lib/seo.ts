import type { Metadata } from "next";

import { normalizeText } from "@/lib/youtube";

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

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
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

export function createTopicMetadata(keyword: string): Metadata {
  const label = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const title = `Search YouTube transcripts for ${label.toLowerCase()} moments`;
  const description = `Find ${label.toLowerCase()} quotes, podcast moments, and timestamps inside YouTube transcripts.`;
  const url = `${getSiteUrl()}${buildTopicPath(keyword)}`;

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

export function createVideoMetadata(videoId: string): Metadata {
  const title = `YouTube transcript search for ${videoId}`;
  const description =
    "Search this YouTube video transcript and jump to exact timestamps without scrubbing.";
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
