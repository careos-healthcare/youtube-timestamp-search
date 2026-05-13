import type { SearchResult, TranscriptLine } from "@/lib/transcript-types";
import { buildMomentPath } from "@/lib/seo";
import {
  formatTimestampFromMs,
  getYouTubeWatchUrl,
  normalizeText,
} from "@/lib/youtube";

const MAX_RESULTS = 20;
const MAX_NEIGHBOR_LINES = 1;
const MAX_NEARBY_SECONDS = 10;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "have",
  "i",
  "if",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "this",
  "to",
  "was",
  "we",
  "with",
  "you",
  "your",
]);

function getFallbackTerms(phrase: string) {
  return Array.from(
    new Set(
      normalizeText(phrase)
        .toLowerCase()
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

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

export function findMatches(
  videoId: string,
  transcript: TranscriptLine[],
  phrase: string
): SearchResult[] {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const fallbackTerms = getFallbackTerms(phrase);

  const collectResults = (predicate: (snippetLower: string) => string[]) => {
    const matches: SearchResult[] = [];

    for (let index = 0; index < transcript.length; index += 1) {
      const snippet = buildMergedSnippet(transcript, index);
      const snippetLower = snippet.toLowerCase();
      const highlightTerms = predicate(snippetLower);

      if (highlightTerms.length === 0) {
        continue;
      }

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
        highlightTerms,
        pageUrl: buildMomentPath(videoId, phrase),
      });

      if (matches.length >= MAX_RESULTS) {
        break;
      }
    }

    return matches;
  };

  const exactPhraseMatches = collectResults((snippetLower) =>
    normalizedPhrase && snippetLower.includes(normalizedPhrase) ? [phrase] : []
  );

  if (exactPhraseMatches.length > 0) {
    return exactPhraseMatches;
  }

  return collectResults((snippetLower) =>
    fallbackTerms.filter((term) => snippetLower.includes(term))
  );
}

export function suggestKeywords(
  transcript: TranscriptLine[],
  currentQuery: string,
  limit = 8
) {
  const currentTerms = new Set(getFallbackTerms(currentQuery));
  const counts = new Map<string, number>();

  for (const line of transcript) {
    for (const rawWord of line.text.toLowerCase().split(/[^a-z0-9'-]+/)) {
      const word = rawWord.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
      if (word.length < 4 || STOP_WORDS.has(word) || currentTerms.has(word)) {
        continue;
      }

      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function getTranscriptPreview(transcript: TranscriptLine[], limit = 12) {
  return transcript.slice(0, limit);
}
