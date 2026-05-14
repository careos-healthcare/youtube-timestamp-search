import type { TranscriptLine } from "@/lib/transcript-types";
import { findMatches } from "@/lib/transcript-search";
import { buildMomentPath } from "@/lib/seo";
import { getYouTubeWatchUrl } from "@/lib/youtube";

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "could",
  "going",
  "really",
  "should",
  "something",
  "their",
  "there",
  "these",
  "think",
  "those",
  "video",
  "would",
  "youtube",
]);

export type BestMomentReason = "repeated-phrase" | "keyword-density" | "semantic-anchor";

export type BestMoment = {
  keyword: string;
  timestamp: string;
  start: number;
  snippet: string;
  momentPath: string;
  youtubeUrl: string;
  score: number;
  reason: BestMomentReason;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9'-]+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

function collectRepeatedPhrases(transcript: TranscriptLine[], limit: number) {
  const counts = new Map<string, number>();

  for (const line of transcript) {
    const words = tokenize(line.text);
    for (let index = 0; index < words.length - 1; index += 1) {
      const bigram = `${words[index]} ${words[index + 1]}`;
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    }
    for (let index = 0; index < words.length - 2; index += 1) {
      const trigram = `${words[index]} ${words[index + 1]} ${words[index + 2]}`;
      counts.set(trigram, (counts.get(trigram) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function scoreSegmentDensity(segment: TranscriptLine, keywords: string[]) {
  const tokens = new Set(tokenize(segment.text));
  return keywords.reduce((score, keyword) => score + (tokens.has(keyword) ? 1 : 0), 0);
}

export function extractBestMoments(
  videoId: string,
  transcript: TranscriptLine[],
  limit = 8
): BestMoment[] {
  if (transcript.length === 0) {
    return [];
  }

  const wordCounts = new Map<string, number>();
  for (const line of transcript) {
    for (const word of tokenize(line.text)) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  const semanticKeywords = [...wordCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([word]) => word);

  const repeatedPhrases = collectRepeatedPhrases(transcript, 10);
  const candidates: BestMoment[] = [];
  const seenStarts = new Set<number>();

  function pushCandidate(
    keyword: string,
    reason: BestMomentReason,
    baseScore: number
  ) {
    const matches = findMatches(videoId, transcript, keyword);
    const match = matches[0];
    if (!match) return;

    const roundedStart = Math.round(match.start);
    if (seenStarts.has(roundedStart)) return;

    seenStarts.add(roundedStart);
    candidates.push({
      keyword,
      timestamp: match.timestamp,
      start: match.start,
      snippet: match.snippet,
      momentPath: buildMomentPath(videoId, keyword),
      youtubeUrl: getYouTubeWatchUrl(videoId, match.start),
      score: baseScore,
      reason,
    });
  }

  for (const { phrase, count } of repeatedPhrases) {
    pushCandidate(phrase, "repeated-phrase", count * 4);
  }

  const denseSegments = [...transcript]
    .map((segment, index) => ({
      index,
      segment,
      density: scoreSegmentDensity(segment, semanticKeywords),
    }))
    .filter((entry) => entry.density > 0)
    .sort((left, right) => right.density - left.density)
    .slice(0, 6);

  for (const entry of denseSegments) {
    const anchor = semanticKeywords.find((keyword) =>
      entry.segment.text.toLowerCase().includes(keyword)
    );
    if (!anchor) continue;
    pushCandidate(anchor, "keyword-density", entry.density * 3 + 2);
  }

  for (const [index, keyword] of semanticKeywords.entries()) {
    const frequency = wordCounts.get(keyword) ?? 1;
    pushCandidate(keyword, "semantic-anchor", frequency * 2 + (semanticKeywords.length - index));
  }

  return candidates
    .sort((left, right) => right.score - left.score || left.start - right.start)
    .slice(0, limit);
}
