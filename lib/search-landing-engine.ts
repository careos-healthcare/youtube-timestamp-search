import { buildMomentPath, buildVideoPath } from "@/lib/seo";
import { raceWithTimeout, SearchLandingTimeoutError } from "@/lib/search/async-timeout";
import { buildAnswerDominance, type AnswerDominanceResult } from "@/lib/search/answer-dominance";
import { hybridSearchTranscripts } from "@/lib/search/hybrid-search-engine";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { synthesizeMultiVideoAnswer, type MultiVideoSynthesis } from "@/lib/search/multi-video-synthesis";
import { getPeopleAlsoSearched, getRelatedIntentGroups } from "@/lib/search/related-intent";
import type { IndexedTranscriptSearchResult } from "@/lib/search/types";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type { SearchLandingMoment } from "@/lib/search/landing-types";

export type SearchLandingLoadMeta = {
  timedOut: boolean;
  degradedReason?: "timeout" | "error";
};

export type SearchLandingData = {
  phrase: string;
  moments: SearchLandingMoment[];
  videoCount: number;
  relatedPhrases: string[];
  peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }>;
  relatedIntentGroups: ReturnType<typeof getRelatedIntentGroups>;
  searchMode: string;
  answer: AnswerDominanceResult;
  synthesis: MultiVideoSynthesis;
  topVideos: Array<{
    videoId: string;
    title: string;
    channelName?: string;
    videoPath: string;
    matchCount: number;
  }>;
  /** Present when the server used a degraded path (e.g. deadline exceeded). */
  loadMeta?: SearchLandingLoadMeta;
};

export type GetSearchLandingDataOptions = {
  /** When true, do not wrap the pipeline in a deadline (scripts, offline jobs). */
  disableTimeout?: boolean;
  /** Override default / env deadline (ms). */
  timeoutMs?: number;
};

function buildTopVideos(results: IndexedTranscriptSearchResult[]) {
  return results.map((result) => ({
    videoId: result.videoId,
    title: result.title ?? result.videoId,
    channelName: result.channelName,
    videoPath: buildVideoPath(result.videoId),
    matchCount: result.matches.length,
  }));
}

function readSearchLandingTimeoutMs(override?: number): number {
  if (override != null && Number.isFinite(override) && override >= 1500) {
    return Math.min(override, 45000);
  }
  const raw = typeof process !== "undefined" ? process.env.SEARCH_LANDING_TIMEOUT_MS : undefined;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1500) return Math.min(n, 45000);
  }
  if (typeof process !== "undefined" && process.env.VERCEL === "1") {
    return 8500;
  }
  return 22000;
}

/** SEO-safe shell when hybrid / related-intent work cannot finish in time. */
export function buildTimeoutFallbackSearchLandingData(phrase: string): SearchLandingData {
  const trimmed = phrase.trim();
  const peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }> = [];
  const moments: SearchLandingMoment[] = [];

  const answer = buildAnswerDominance({
    query: trimmed,
    moments,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
  });
  const synthesis = synthesizeMultiVideoAnswer(trimmed, moments);

  return {
    phrase: trimmed,
    moments,
    videoCount: 0,
    relatedPhrases: [],
    peopleAlsoSearched,
    relatedIntentGroups: getRelatedIntentGroups(trimmed),
    searchMode: "timeout-fallback",
    answer,
    synthesis,
    topVideos: [],
  };
}

async function getSearchLandingDataCore(phrase: string, limit = 40): Promise<SearchLandingData> {
  const trimmed = phrase.trim();
  const hybrid = await hybridSearchTranscripts(trimmed, 25, { momentLimit: limit });
  const peopleAlsoSearched = await getPeopleAlsoSearched(trimmed, 12);

  const moments: SearchLandingMoment[] = hybrid.moments.slice(0, limit).map((moment) => ({
    videoId: moment.videoId,
    videoTitle: moment.title ?? `Video ${moment.videoId}`,
    channelName: moment.channelName,
    timestamp: moment.match.timestamp,
    startSeconds: moment.match.start,
    snippet: moment.match.snippet,
    momentPath: buildMomentPath(moment.videoId, trimmed),
    youtubeUrl: getYouTubeWatchUrl(moment.videoId, moment.match.start),
    videoPath: buildVideoPath(moment.videoId),
    score: moment.ranking.finalScore,
    ranking: moment.ranking,
  }));

  const answer = buildAnswerDominance({
    query: trimmed,
    moments,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
  });
  const synthesis = synthesizeMultiVideoAnswer(trimmed, moments);

  return {
    phrase: trimmed,
    moments,
    videoCount: hybrid.results.length,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
    relatedIntentGroups: getRelatedIntentGroups(trimmed),
    searchMode: hybrid.diagnostics.mode,
    answer,
    synthesis,
    topVideos: buildTopVideos(hybrid.results),
  };
}

export async function getSearchLandingData(
  phrase: string,
  limit = 40,
  options?: GetSearchLandingDataOptions
): Promise<SearchLandingData> {
  if (options?.disableTimeout) {
    return getSearchLandingDataCore(phrase, limit);
  }

  const budgetMs = readSearchLandingTimeoutMs(options?.timeoutMs);

  try {
    return await raceWithTimeout(
      getSearchLandingDataCore(phrase, limit),
      budgetMs,
      "getSearchLandingData"
    );
  } catch (error) {
    if (error instanceof SearchLandingTimeoutError) {
      console.warn("[search-landing] TIMEOUT_FALLBACK", {
        phrase: phrase.trim().slice(0, 120),
        budgetMs,
        label: error.label,
        vercel: process.env.VERCEL,
      });
      return {
        ...buildTimeoutFallbackSearchLandingData(phrase),
        loadMeta: { timedOut: true, degradedReason: "timeout" },
      };
    }
    console.error("[search-landing] UNEXPECTED_ERROR", {
      phrase: phrase.trim().slice(0, 120),
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = buildTimeoutFallbackSearchLandingData(phrase);
    return {
      ...fallback,
      loadMeta: { timedOut: false, degradedReason: "error" },
      searchMode: "error-fallback",
    };
  }
}

export { SearchLandingTimeoutError } from "@/lib/search/async-timeout";
