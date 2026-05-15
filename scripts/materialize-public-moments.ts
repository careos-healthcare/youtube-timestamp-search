#!/usr/bin/env tsx
/**
 * Writes data/public-moments.json — lightweight materialization for canonical /moment/[id]/[slug] pages.
 *
 *   npm run materialize:public-moments
 *   PUBLIC_MOMENTS_CAP=200 PUBLIC_MOMENTS_PER_VIDEO=4 npm run materialize:public-moments
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { computePublicMomentStableId } from "@/lib/moments/stable-id";
import { hybridFindMatches } from "@/lib/search/per-video-hybrid-search";
import { slugifyQuery } from "@/lib/seo";
import { suggestKeywords } from "@/lib/transcript-search";
import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import type { TranscriptLine } from "@/lib/transcript-types";

const CAP = Number(process.env.PUBLIC_MOMENTS_CAP ?? 120);
const PER_VIDEO = Number(process.env.PUBLIC_MOMENTS_PER_VIDEO ?? 3);

function toTranscriptLines(
  segments: Array<{ text: string; start: number; duration?: number }>
): TranscriptLine[] {
  return segments.map((segment) => ({
    text: segment.text,
    start: segment.start,
    duration: segment.duration ?? 0,
  }));
}

function disambiguateSlug(base: string, used: Set<string>) {
  let slug = base;
  let n = 0;
  while (used.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  used.add(slug);
  return slug;
}

async function main() {
  const summaries = await listCachedTranscripts();
  const usedSlugs = new Set<string>();
  const moments: PublicMomentRecord[] = [];

  for (const summary of summaries) {
    if (moments.length >= CAP) break;

    const cached = await getCachedTranscript(summary.videoId);
    if (!cached || cached.segments.length === 0) continue;

    const lines = toTranscriptLines(cached.segments);
    const keywords = suggestKeywords(lines, "", PER_VIDEO + 2);
    const indexed = await getIndexedVideoById(summary.videoId);

    for (const phrase of keywords.slice(0, PER_VIDEO)) {
      if (moments.length >= CAP) break;
      const trimmed = phrase.trim();
      if (!trimmed) continue;

      const results = hybridFindMatches(summary.videoId, lines, trimmed);
      const top = results[0];
      if (!top) continue;

      const id = computePublicMomentStableId(summary.videoId, top.start, trimmed);
      if (moments.some((m) => m.id === id)) continue;

      const baseSlug = slugifyQuery(trimmed);
      const canonicalSlug = disambiguateSlug(baseSlug, usedSlugs);

      moments.push({
        id,
        videoId: summary.videoId,
        phrase: trimmed,
        canonicalSlug,
        startSeconds: top.start,
        timestamp: top.timestamp,
        snippet: top.snippet,
        youtubeUrl: top.openUrl,
        videoTitle: indexed?.title,
        channelName: indexed?.channelName ?? undefined,
        materializedAt: new Date().toISOString(),
      });
    }
  }

  const outPath = join(process.cwd(), "data/public-moments.json");
  writeFileSync(outPath, `${JSON.stringify({ moments }, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${moments.length} public moments to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
