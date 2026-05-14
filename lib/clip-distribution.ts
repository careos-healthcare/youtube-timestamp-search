import { getSiteUrl } from "@/lib/seo";

export type ShareChannel = "reddit" | "hackernews" | "twitter" | "embed" | "copy" | "generic";
export type ShareCampaign = "search" | "answer" | "moment";
export type ShareMedium = "social" | "embed" | "copy" | "card";

export type ClipBriefInput = {
  kind: ShareCampaign;
  title: string;
  quote: string;
  timestampUrl: string;
  contextSentence?: string;
  pageUrl: string;
  videoId?: string;
  videoTitle?: string;
  channelName?: string;
  timestampLabel?: string;
};

export type SocialPostFormats = {
  redditTitle: string;
  redditBody: string;
  hackerNewsTitle: string;
  xPost: string;
};

const LEGAL_FOOTER =
  "Transcript excerpt only. Opens on YouTube at the timestamp. This tool does not download, clip, or rehost video.";

export function appendShareUtm(
  url: string,
  options: {
    source: ShareChannel;
    medium: ShareMedium;
    campaign: ShareCampaign;
    content?: string;
  }
) {
  const parsed = new URL(url, getSiteUrl());
  const sourceMap: Record<ShareChannel, string> = {
    reddit: "reddit",
    hackernews: "hackernews",
    twitter: "twitter",
    embed: "embed",
    copy: "copy",
    generic: "share",
  };

  parsed.searchParams.set("utm_source", sourceMap[options.source]);
  parsed.searchParams.set("utm_medium", options.medium);
  parsed.searchParams.set("utm_campaign", options.campaign);
  if (options.content) {
    parsed.searchParams.set("utm_content", options.content.slice(0, 80));
  }

  return parsed.toString();
}

export function buildClipBrief(input: ClipBriefInput) {
  const contextSentence = input.contextSentence ?? buildContextSentence(input);
  const lines = [
    `Title: ${input.title}`,
    `Quote: "${input.quote}"`,
    `Timestamp URL: ${input.timestampUrl}`,
    `Context: ${contextSentence}`,
    `Landing page: ${input.pageUrl}`,
  ];

  if (input.videoTitle) lines.push(`Video: ${input.videoTitle}`);
  if (input.channelName) lines.push(`Channel: ${input.channelName}`);
  if (input.timestampLabel) lines.push(`Timestamp: ${input.timestampLabel}`);
  lines.push("", LEGAL_FOOTER);

  return lines.join("\n");
}

export function buildSocialPostFormats(
  input: ClipBriefInput,
  options?: { pageUrlWithUtm?: string }
): SocialPostFormats {
  const pageUrl = options?.pageUrlWithUtm ?? input.pageUrl;
  const contextSentence = input.contextSentence ?? buildContextSentence(input);
  const redditTitle =
    input.kind === "answer"
      ? `[Transcript answer] ${input.title}`
      : input.kind === "moment"
        ? `[Timestamped moment] ${input.quote.slice(0, 90)}${input.quote.length > 90 ? "…" : ""}`
        : `[Searchable moments] ${input.title}`;

  const redditBody = [
    contextSentence,
    "",
    `> ${input.quote}`,
    "",
    `YouTube: ${input.timestampUrl}`,
    `More context: ${pageUrl}`,
    "",
    LEGAL_FOOTER,
  ].join("\n");

  const hackerNewsTitle =
    input.kind === "answer"
      ? `${input.title} — transcript answer with timestamp link`
      : input.kind === "moment"
        ? `Timestamped transcript moment: ${input.quote.slice(0, 72)}`
        : `Search inside video for "${input.title}" — indexed transcript moments`;

  const xPost = truncate(
    `${input.quote.slice(0, 140)}${input.quote.length > 140 ? "…" : ""} → ${pageUrl}`,
    275
  );

  return { redditTitle, redditBody, hackerNewsTitle, xPost };
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function buildContextSentence(input: ClipBriefInput) {
  if (input.kind === "answer") {
    return `Spoken answer excerpt for "${input.title}" from ${input.videoTitle ?? "an indexed video"}${input.timestampLabel ? ` at ${input.timestampLabel}` : ""}.`;
  }

  if (input.kind === "moment") {
    return `Transcript moment for "${input.title}" in ${input.videoTitle ?? "this video"}${input.timestampLabel ? ` at ${input.timestampLabel}` : ""}.`;
  }

  return `Indexed transcript search for "${input.title}" across long-form YouTube videos.`;
}
