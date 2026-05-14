import { buildMomentUrl, buildSearchPath, buildVideoPath, getSiteUrl, slugifyQuery } from "@/lib/seo";

import { appendShareUtm, type ShareCampaign, type ShareChannel, type ShareMedium } from "@/lib/clip-distribution";

export function buildSearchOgImageUrl(query: string) {
  const slug = slugifyQuery(query);
  return `${getSiteUrl()}/api/og/search/${slug}`;
}

export function buildAnswerOgImageUrl(query: string) {
  const slug = slugifyQuery(query);
  return `${getSiteUrl()}/api/og/answer/${slug}`;
}

export function buildMomentOgImageUrl(
  videoId: string,
  options?: { query?: string; timestamp?: string; snippet?: string }
) {
  const params = new URLSearchParams();
  if (options?.query) params.set("q", options.query);
  if (options?.timestamp) params.set("t", options.timestamp);
  if (options?.snippet) params.set("snippet", options.snippet.slice(0, 240));
  const query = params.toString();
  return `${getSiteUrl()}/api/og/moment/${encodeURIComponent(videoId)}${query ? `?${query}` : ""}`;
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

export function buildEmbedAnswerUrl(query: string) {
  return `${getSiteUrl()}/embed/answer?q=${encodeURIComponent(query)}`;
}

export function buildEmbedMomentUrl(
  videoId: string,
  query: string,
  options?: { timestamp?: string; snippet?: string; channelName?: string }
) {
  const params = new URLSearchParams({
    videoId,
    q: query,
  });
  if (options?.timestamp) params.set("t", options.timestamp);
  if (options?.snippet) params.set("snippet", options.snippet.slice(0, 280));
  if (options?.channelName) params.set("channel", options.channelName);
  return `${getSiteUrl()}/embed/moment?${params.toString()}`;
}

export function buildTrackedShareUrl(
  url: string,
  options: {
    source: ShareChannel;
    medium: ShareMedium;
    campaign: ShareCampaign;
    content?: string;
  }
) {
  return appendShareUtm(url, options);
}

export function buildTrackedSearchPageUrl(
  query: string,
  source: ShareChannel,
  medium: ShareMedium = "social"
) {
  return appendShareUtm(buildSearchPageUrl(query), {
    source,
    medium,
    campaign: "search",
    content: query,
  });
}

export function buildTrackedMomentPageUrl(
  videoId: string,
  query: string,
  source: ShareChannel,
  medium: ShareMedium = "social"
) {
  return appendShareUtm(buildMomentUrl(videoId, query), {
    source,
    medium,
    campaign: "moment",
    content: videoId,
  });
}
