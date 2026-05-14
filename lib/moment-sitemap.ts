import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import { suggestKeywords } from "@/lib/transcript-search";
import type { TranscriptLine } from "@/lib/transcript-types";
import { buildMomentPath } from "@/lib/seo";
import {
  SITEMAP_MOMENT_URL_CAP,
  SITEMAP_MOMENTS_PER_VIDEO,
} from "@/lib/sitemap-config";

export type MomentSitemapEntry = {
  videoId: string;
  phrase: string;
  path: string;
};

function toTranscriptLines(
  segments: Array<{ text: string; start: number; duration?: number }>
): TranscriptLine[] {
  return segments.map((segment) => ({
    text: segment.text,
    start: segment.start,
    duration: segment.duration ?? 0,
  }));
}

export async function buildMomentSitemapEntries(
  cap = SITEMAP_MOMENT_URL_CAP,
  perVideo = SITEMAP_MOMENTS_PER_VIDEO
): Promise<MomentSitemapEntry[]> {
  const summaries = await listCachedTranscripts();
  const entries: MomentSitemapEntry[] = [];

  for (const summary of summaries) {
    if (entries.length >= cap) break;

    const cached = await getCachedTranscript(summary.videoId);
    if (!cached || cached.segments.length === 0) continue;

    const keywords = suggestKeywords(toTranscriptLines(cached.segments), "", perVideo);
    for (const phrase of keywords.slice(0, perVideo)) {
      if (entries.length >= cap) break;
      entries.push({
        videoId: summary.videoId,
        phrase,
        path: buildMomentPath(summary.videoId, phrase),
      });
    }
  }

  return entries;
}
