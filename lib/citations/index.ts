export type { MomentCitationBundle, MomentCitationInput } from "./moment-citation";
export { buildMomentCitationBundle, citationAccessDateUtc } from "./moment-citation";

import { buildMomentCitationBundle, type MomentCitationInput } from "./moment-citation";

/** Absolute canonical public moment URL. */
export function buildCanonicalMomentUrl(siteUrl: string, momentId: string, canonicalSlug: string): string {
  const site = siteUrl.replace(/\/$/, "");
  return `${site}/moment/${momentId}/${canonicalSlug}`;
}

/** YouTube URL with playback offset (materialized watch URL). */
export function buildYouTubeTimestampMomentUrl(input: Pick<MomentCitationInput, "youtubeUrl">): string {
  return input.youtubeUrl.trim();
}

/** Same as {@link buildYouTubeTimestampMomentUrl} for this product (timestamp lives on YouTube). */
export function buildMomentTimestampUrl(input: Pick<MomentCitationInput, "youtubeUrl">): string {
  return buildYouTubeTimestampMomentUrl(input);
}

export function buildMarkdownMomentCitation(siteUrl: string, input: MomentCitationInput): string {
  return buildMomentCitationBundle(siteUrl, input).markdown;
}

export function buildPlainTextMomentCitation(siteUrl: string, input: MomentCitationInput): string {
  return buildMomentCitationBundle(siteUrl, input).plainText;
}

export function buildAcademicMomentCitation(siteUrl: string, input: MomentCitationInput): string {
  return buildMomentCitationBundle(siteUrl, input).academic;
}

export function buildMomentHtmlEmbedSnippet(siteUrl: string, input: MomentCitationInput): string {
  return buildMomentCitationBundle(siteUrl, input).htmlEmbed;
}
