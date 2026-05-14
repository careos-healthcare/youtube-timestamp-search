import type { TranscriptLine } from "@/lib/transcript-types";
import { findMatches } from "@/lib/transcript-search";
import { formatTimestampFromMs } from "@/lib/youtube";

export type TranscriptPreviewSection = {
  id: string;
  startSeconds: number;
  startTimestamp: string;
  lines: Array<{
    start: number;
    timestamp: string;
    text: string;
  }>;
};

export type SearchableMoment = {
  keyword: string;
  timestamp: string;
  start: number;
  snippet: string;
  momentPath: string;
};

export function buildTranscriptPreviewSections(
  transcript: TranscriptLine[],
  options?: { linesPerSection?: number; maxSections?: number }
): TranscriptPreviewSection[] {
  const linesPerSection = options?.linesPerSection ?? 14;
  const maxSections = options?.maxSections ?? 10;

  if (transcript.length === 0) {
    return [];
  }

  const sections: TranscriptPreviewSection[] = [];

  for (let offset = 0; offset < transcript.length && sections.length < maxSections; offset += linesPerSection) {
    const chunk = transcript.slice(offset, offset + linesPerSection);
    const first = chunk[0];
    if (!first) continue;

    sections.push({
      id: `section-${offset}`,
      startSeconds: first.start,
      startTimestamp: formatTimestampFromMs(first.start * 1000),
      lines: chunk.map((line) => ({
        start: line.start,
        timestamp: formatTimestampFromMs(line.start * 1000),
        text: line.text,
      })),
    });
  }

  return sections;
}

export function buildSearchableMoments(
  videoId: string,
  transcript: TranscriptLine[],
  keywords: string[],
  limit = 8
): SearchableMoment[] {
  const moments: SearchableMoment[] = [];
  const seenStarts = new Set<number>();

  for (const keyword of keywords) {
    const matches = findMatches(videoId, transcript, keyword);
    const match = matches[0];
    if (!match) continue;

    const roundedStart = Math.round(match.start);
    if (seenStarts.has(roundedStart)) continue;

    seenStarts.add(roundedStart);
    moments.push({
      keyword,
      timestamp: match.timestamp,
      start: match.start,
      snippet: match.snippet,
      momentPath: match.pageUrl,
    });

    if (moments.length >= limit) {
      break;
    }
  }

  return moments;
}
