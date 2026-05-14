import type { TranscriptLine, SearchResult } from "@/lib/transcript-types";
import { buildMomentPath } from "@/lib/seo";
import { applyHybridDiversity, buildRankableMoments } from "@/lib/search/hybrid-ranking";
import {
  formatTimestampFromMs,
  getYouTubeWatchUrl,
  normalizeText,
} from "@/lib/youtube";

const MAX_RESULTS = 20;
const MAX_NEIGHBOR_LINES = 1;
const MAX_NEARBY_SECONDS = 10;

function buildMergedSnippet(transcript: TranscriptLine[], index: number) {
  let startIndex = index;
  let endIndex = index;

  while (
    startIndex > 0 &&
    index - startIndex < MAX_NEIGHBOR_LINES &&
    transcript[index].start - transcript[startIndex - 1].start <= MAX_NEARBY_SECONDS
  ) {
    startIndex -= 1;
  }

  while (
    endIndex < transcript.length - 1 &&
    endIndex - index < MAX_NEIGHBOR_LINES &&
    transcript[endIndex + 1].start - transcript[endIndex].start <= MAX_NEARBY_SECONDS
  ) {
    endIndex += 1;
  }

  return normalizeText(
    transcript
      .slice(startIndex, endIndex + 1)
      .map((entry) => entry.text)
      .join(" ")
  );
}

function formatTimestampFromSeconds(seconds: number) {
  return formatTimestampFromMs(seconds * 1000);
}

function collectKeywordMatches(
  videoId: string,
  transcript: TranscriptLine[],
  phrase: string,
  predicate: (snippetLower: string) => boolean
) {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const matches: SearchResult[] = [];
  let score = 0;

  for (let index = 0; index < transcript.length; index += 1) {
    const snippet = buildMergedSnippet(transcript, index);
    const snippetLower = snippet.toLowerCase();
    if (!predicate(snippetLower)) continue;

    const phraseHit = normalizedPhrase && snippetLower.includes(normalizedPhrase);
    score += phraseHit ? 12 : 3;

    const start = Math.max(0, transcript[index]?.start ?? 0);
    const previousMatch = matches.at(-1);
    if (previousMatch && Math.abs(previousMatch.start - start) < 3) {
      continue;
    }

    matches.push({
      start,
      timestamp: formatTimestampFromSeconds(start),
      snippet,
      openUrl: getYouTubeWatchUrl(videoId, start),
      highlightTerms: phraseHit ? [phrase] : [],
      pageUrl: buildMomentPath(videoId, phrase),
    });

    if (matches.length >= MAX_RESULTS * 2) {
      break;
    }
  }

  return { matches, score };
}

export function hybridFindMatches(
  videoId: string,
  transcript: TranscriptLine[],
  phrase: string
): SearchResult[] {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const terms = normalizedPhrase.split(/\s+/).filter(Boolean);

  const exact = collectKeywordMatches(
    videoId,
    transcript,
    phrase,
    (snippetLower) => Boolean(normalizedPhrase && snippetLower.includes(normalizedPhrase))
  );

  const keywordPool =
    exact.matches.length > 0
      ? exact
      : collectKeywordMatches(videoId, transcript, phrase, (snippetLower) =>
          terms.some((term) => snippetLower.includes(term))
        );

  const keywordResults = [
    {
      videoId,
      videoUrl: getYouTubeWatchUrl(videoId),
      score: keywordPool.score,
      matches: keywordPool.matches.map((match) => ({
        start: match.start,
        timestamp: match.timestamp,
        snippet: match.snippet,
        text: match.snippet,
      })),
    },
  ];

  const ranked = applyHybridDiversity(
    buildRankableMoments(phrase, keywordResults, [])
  ).slice(0, MAX_RESULTS);

  return ranked.map((moment) => ({
    start: moment.match.start,
    timestamp: moment.match.timestamp,
    snippet: moment.match.snippet,
    openUrl: getYouTubeWatchUrl(videoId, moment.match.start),
    highlightTerms: normalizedPhrase && moment.match.snippet.toLowerCase().includes(normalizedPhrase)
      ? [phrase]
      : [],
    pageUrl: buildMomentPath(videoId, phrase),
  }));
}
