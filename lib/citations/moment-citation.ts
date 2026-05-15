import { buildEmbedMomentUrl } from "@/lib/og-urls";
import { normalizeText } from "@/lib/youtube";

export type MomentCitationInput = {
  momentId: string;
  canonicalSlug: string;
  videoId: string;
  phrase: string;
  snippet: string;
  videoTitle: string;
  channelName?: string;
  timestamp: string;
  youtubeUrl: string;
};

export type MomentCitationBundle = {
  markdown: string;
  plainText: string;
  academic: string;
  htmlEmbed: string;
  /** YouTube URL with playback offset (same as input when materialized). */
  timestampUrl: string;
  canonicalMomentUrl: string;
  youtubeTimestampUrl: string;
};

function escapeAttr(value: string) {
  return normalizeText(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Access date in UTC YYYY-MM-DD (stable for SSR; client copy may refresh in UI if needed). */
export function citationAccessDateUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function buildMomentCitationBundle(siteUrl: string, input: MomentCitationInput): MomentCitationBundle {
  const site = siteUrl.replace(/\/$/, "");
  const canonicalMomentUrl = `${site}/moment/${input.momentId}/${input.canonicalSlug}`;
  const channel = input.channelName?.trim() || "YouTube creator";
  const title = normalizeText(input.videoTitle);
  const quote = normalizeText(input.snippet);
  const phrase = normalizeText(input.phrase);
  const accessed = citationAccessDateUtc();
  const youtubeTimestampUrl = input.youtubeUrl.trim();

  const embedSrc = buildEmbedMomentUrl(input.videoId, input.phrase, {
    timestamp: input.timestamp,
    snippet: input.snippet,
    channelName: input.channelName,
  });
  const iframeTitle = escapeAttr(`Transcript moment: ${phrase}`);
  const htmlEmbed = `<iframe src="${embedSrc}" width="100%" height="280" style="border:0;border-radius:12px" loading="lazy" title="${iframeTitle}"></iframe>`;

  const plainText = [
    `"${quote.slice(0, 520)}${quote.length > 520 ? "…" : ""}"`,
    "",
    `Title: ${title}`,
    `Channel: ${channel}`,
    `Timestamp: ${input.timestamp}`,
    `Phrase: ${phrase}`,
    `Canonical moment: ${canonicalMomentUrl}`,
    `YouTube (timestamped): ${youtubeTimestampUrl}`,
    `Retrieved: ${accessed}`,
  ].join("\n");

  const markdown = [
    `> ${quote.slice(0, 520)}${quote.length > 520 ? "…" : ""}`,
    "",
    `**${title}** · ${channel} · \`${input.timestamp}\``,
    "",
    `**Moment:** “${phrase}”`,
    "",
    `- **Canonical:** ${canonicalMomentUrl}`,
    `- **YouTube:** ${youtubeTimestampUrl}`,
    `- **Retrieved:** ${accessed}`,
  ].join("\n");

  const academic = `${channel}. “${phrase.slice(0, 280)}${phrase.length > 280 ? "…" : ""}.” In *${title}* (YouTube video). Timestamp ${input.timestamp}. ${youtubeTimestampUrl}. Canonical page ${canonicalMomentUrl}. Accessed ${accessed}.`;

  return {
    markdown,
    plainText,
    academic,
    htmlEmbed,
    timestampUrl: youtubeTimestampUrl,
    canonicalMomentUrl,
    youtubeTimestampUrl,
  };
}
