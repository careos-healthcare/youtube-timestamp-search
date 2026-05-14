import { buildSearchPath, buildVideoPath, getSiteUrl, slugifyQuery } from "@/lib/seo";

export function buildSearchOgImageUrl(query: string) {
  const slug = slugifyQuery(query);
  return `${getSiteUrl()}/api/og/search/${slug}`;
}

export function buildVideoOgImageUrl(videoId: string) {
  return `${getSiteUrl()}/api/og/video/${encodeURIComponent(videoId)}`;
}

export function buildSearchPageUrl(query: string) {
  return `${getSiteUrl()}${buildSearchPath(query)}`;
}

export function buildVideoPageUrl(videoId: string) {
  return `${getSiteUrl()}${buildVideoPath(videoId)}`;
}

export function buildEmbedSearchUrl(query: string) {
  return `${getSiteUrl()}/embed/search?q=${encodeURIComponent(query)}`;
}

export function buildEmbedMomentUrl(videoId: string, query: string, timestamp?: string) {
  const params = new URLSearchParams({
    videoId,
    q: query,
  });
  if (timestamp) params.set("t", timestamp);
  return `${getSiteUrl()}/embed/moment?${params.toString()}`;
}
