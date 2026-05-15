import { unstable_cache } from "next/cache";

import { buildMomentPath, buildVideoPath } from "@/lib/seo";
import { raceWithTimeout, SearchLandingTimeoutError } from "@/lib/search/async-timeout";
import { buildAnswerDominance, type AnswerDominanceResult } from "@/lib/search/answer-dominance";
import { getBroadQueryCaps, getQueryComplexity, type QueryComplexity } from "@/lib/search/heavy-query-profile";
import { hybridSearchTranscripts } from "@/lib/search/hybrid-search-engine";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { synthesizeMultiVideoAnswer, type MultiVideoSynthesis } from "@/lib/search/multi-video-synthesis";
import { getPeopleAlsoSearched, getRelatedIntentGroups } from "@/lib/search/related-intent";
import { recordSearchLandingDiagnostics } from "@/lib/search/search-runtime-diagnostics";
import type { IndexedTranscriptSearchResult } from "@/lib/search/types";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type { SearchLandingMoment } from "@/lib/search/landing-types";

export type SearchLandingLoadMeta = {
  timedOut: boolean;
  degraded?: boolean;
  degradedReason?: "timeout" | "error" | "budget" | "broad-query";
  timeoutPhase?: "full" | "keyword-rescue" | "none";
  queryComplexity?: QueryComplexity;
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
  loadMeta?: SearchLandingLoadMeta;
};

export type GetSearchLandingDataOptions = {
  disableTimeout?: boolean;
  timeoutMs?: number;
  /** Skip Next `unstable_cache` (OG routes, embeds, scripts). */
  bypassCache?: boolean;
};

function emptySynthesis(query: string): MultiVideoSynthesis {
  return {
    query,
    consensusExplanation: null,
    recurringThemes: [],
    disagreements: [],
    bestExamples: [],
    bestBeginnerSource: null,
    bestAdvancedSource: null,
    videoProfiles: [],
  };
}

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
    return 7800;
  }
  return 22000;
}

function readCacheRevalidateSeconds(): number {
  const raw = typeof process !== "undefined" ? process.env.SEARCH_LANDING_CACHE_SECONDS : undefined;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 120 && n <= 3600) return Math.floor(n);
  }
  return 600;
}

function mapMoments(
  hybrid: Awaited<ReturnType<typeof hybridSearchTranscripts>>,
  trimmed: string,
  limit: number
): SearchLandingMoment[] {
  return hybrid.moments.slice(0, limit).map((moment) => ({
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
}

function finalizeLanding(
  trimmed: string,
  hybrid: Awaited<ReturnType<typeof hybridSearchTranscripts>>,
  moments: SearchLandingMoment[],
  peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }>,
  relatedIntentGroups: ReturnType<typeof getRelatedIntentGroups>,
  synthesis: MultiVideoSynthesis,
  loadMeta?: SearchLandingLoadMeta
): SearchLandingData {
  const answer = buildAnswerDominance({
    query: trimmed,
    moments,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
  });

  return {
    phrase: trimmed,
    moments,
    videoCount: hybrid.results.length,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
    relatedIntentGroups,
    searchMode: hybrid.diagnostics.mode,
    answer,
    synthesis,
    topVideos: buildTopVideos(hybrid.results),
    loadMeta,
  };
}

export function buildTimeoutFallbackSearchLandingData(phrase: string): SearchLandingData {
  const trimmed = phrase.trim();
  const peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }> = [];
  const moments: SearchLandingMoment[] = [];

  const answer = buildAnswerDominance({
    query: trimmed,
    moments,
    relatedPhrases: [],
    peopleAlsoSearched,
  });

  return {
    phrase: trimmed,
    moments,
    videoCount: 0,
    relatedPhrases: [],
    peopleAlsoSearched,
    relatedIntentGroups: [],
    searchMode: "timeout-fallback",
    answer,
    synthesis: emptySynthesis(trimmed),
    topVideos: [],
  };
}

async function fetchPeopleAlsoBounded(
  phrase: string,
  limit: number,
  budgetMs: number
): Promise<Array<{ phrase: string; href: string; score: number }>> {
  if (limit <= 0) return [];
  try {
    return await raceWithTimeout(getPeopleAlsoSearched(phrase, limit), budgetMs, "people_also_searched");
  } catch {
    return [];
  }
}

async function getBroadQueryLanding(trimmed: string): Promise<SearchLandingData> {
  const caps = getBroadQueryCaps();
  const hybrid = await hybridSearchTranscripts(trimmed, caps.hybridResultLimit, {
    momentLimit: caps.momentLimit,
    skipSemantic: true,
    keywordFetchCeiling: caps.keywordFetchCeiling,
    enrichVideoCap: caps.enrichVideoCap,
  });
  const moments = mapMoments(hybrid, trimmed, caps.momentLimit);
  const loadMeta: SearchLandingLoadMeta = {
    timedOut: false,
    degraded: true,
    degradedReason: "broad-query",
    timeoutPhase: "none",
    queryComplexity: "broad",
  };

  return finalizeLanding(trimmed, hybrid, moments, [], [], emptySynthesis(trimmed), loadMeta);
}

async function getFullQueryLanding(trimmed: string, limit: number): Promise<SearchLandingData> {
  const hybrid = await hybridSearchTranscripts(trimmed, 25, { momentLimit: limit });
  const peopleBudget =
    typeof process !== "undefined" && process.env.VERCEL === "1" ? 2000 : 4500;
  const peopleAlsoSearched = await fetchPeopleAlsoBounded(trimmed, 12, peopleBudget);
  const moments = mapMoments(hybrid, trimmed, limit);
  const relatedIntentGroups = getRelatedIntentGroups(trimmed);
  const synthesis = synthesizeMultiVideoAnswer(trimmed, moments);

  return finalizeLanding(trimmed, hybrid, moments, peopleAlsoSearched, relatedIntentGroups, synthesis, {
    timedOut: false,
    degraded: false,
    timeoutPhase: "none",
    queryComplexity: "normal",
  });
}

async function getKeywordRescueLanding(trimmed: string, cap: number): Promise<SearchLandingData> {
  const hybrid = await hybridSearchTranscripts(trimmed, Math.min(cap, 14), {
    momentLimit: Math.min(cap, 12),
    skipSemantic: true,
    keywordFetchCeiling: 20,
    enrichVideoCap: 4,
  });
  const moments = mapMoments(hybrid, trimmed, Math.min(cap, 12));
  const peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }> = [];
  const relatedIntentGroups: ReturnType<typeof getRelatedIntentGroups> = [];
  const loadMeta: SearchLandingLoadMeta = {
    timedOut: true,
    degraded: true,
    degradedReason: "timeout",
    timeoutPhase: "keyword-rescue",
    queryComplexity: "normal",
  };

  return finalizeLanding(
    trimmed,
    hybrid,
    moments,
    peopleAlsoSearched,
    relatedIntentGroups,
    emptySynthesis(trimmed),
    loadMeta
  );
}

async function computeSearchLandingData(
  phrase: string,
  limit: number,
  options?: GetSearchLandingDataOptions
): Promise<SearchLandingData> {
  const trimmed = phrase.trim();
  const complexity = getQueryComplexity(trimmed);

  const finish = (data: SearchLandingData) => {
    recordSearchLandingDiagnostics({
      phrase: trimmed.slice(0, 200),
      degraded: Boolean(data.loadMeta?.degraded || data.loadMeta?.timedOut),
      timeoutPhase: data.loadMeta?.timeoutPhase,
      queryComplexity: data.loadMeta?.queryComplexity ?? complexity,
      searchMode: data.searchMode,
      momentCount: data.moments.length,
      videoCount: data.videoCount,
    });
    return data;
  };

  if (options?.disableTimeout) {
    if (complexity === "broad") {
      return finish(await getBroadQueryLanding(trimmed));
    }
    return finish(await getFullQueryLanding(trimmed, limit));
  }

  const budgetMs = readSearchLandingTimeoutMs(options?.timeoutMs);
  const rescueBudget = Math.min(3200, Math.max(1200, Math.floor(budgetMs * 0.35)));

  if (complexity === "broad") {
    try {
      const data = await raceWithTimeout(getBroadQueryLanding(trimmed), budgetMs, "search_landing_broad");
      return finish(data);
    } catch (error) {
      if (error instanceof SearchLandingTimeoutError) {
        console.warn("[search-landing] BROAD_TIMEOUT", { phrase: trimmed.slice(0, 120), budgetMs });
        const rescue = await raceWithTimeout(
          getKeywordRescueLanding(trimmed, 12),
          rescueBudget,
          "search_landing_broad_rescue"
        ).catch(() => null);

        if (rescue && rescue.moments.length > 0) {
          return finish({
            ...rescue,
            loadMeta: {
              timedOut: true,
              degraded: true,
              degradedReason: "timeout",
              timeoutPhase: "keyword-rescue",
              queryComplexity: "broad",
            },
          });
        }

        return finish({
          ...buildTimeoutFallbackSearchLandingData(trimmed),
          loadMeta: {
            timedOut: true,
            degraded: true,
            degradedReason: "timeout",
            timeoutPhase: "full",
            queryComplexity: "broad",
          },
        });
      }
      throw error;
    }
  }

  try {
    const data = await raceWithTimeout(getFullQueryLanding(trimmed, limit), budgetMs, "search_landing_full");
    return finish(data);
  } catch (error) {
    if (error instanceof SearchLandingTimeoutError) {
      console.warn("[search-landing] TIMEOUT_FALLBACK", {
        phrase: trimmed.slice(0, 120),
        budgetMs,
        label: error.label,
        vercel: process.env.VERCEL,
      });

      const rescue = await raceWithTimeout(
        getKeywordRescueLanding(trimmed, limit),
        rescueBudget,
        "search_landing_keyword_rescue"
      ).catch(() => null);

      if (rescue && rescue.moments.length > 0) {
        return finish(rescue);
      }

      return finish({
        ...buildTimeoutFallbackSearchLandingData(trimmed),
        loadMeta: {
          timedOut: true,
          degraded: true,
          degradedReason: "timeout",
          timeoutPhase: "full",
          queryComplexity: "normal",
        },
      });
    }

    console.error("[search-landing] UNEXPECTED_ERROR", {
      phrase: trimmed.slice(0, 120),
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = buildTimeoutFallbackSearchLandingData(trimmed);
    return finish({
      ...fallback,
      loadMeta: {
        timedOut: false,
        degraded: true,
        degradedReason: "error",
        timeoutPhase: "none",
        queryComplexity: complexity,
      },
      searchMode: "error-fallback",
    });
  }
}

export async function getSearchLandingData(
  phrase: string,
  limit = 40,
  options?: GetSearchLandingDataOptions
): Promise<SearchLandingData> {
  if (options?.bypassCache || options?.disableTimeout) {
    return computeSearchLandingData(phrase, limit, options);
  }

  const normalizedPhrase = phrase.trim().toLowerCase();
  const revalidate = readCacheRevalidateSeconds();
  const cached = unstable_cache(
    async (canonicalPhrase: string, lim: number) =>
      computeSearchLandingData(canonicalPhrase, lim, {
        bypassCache: true,
      }),
    ["search-landing-data"],
    { revalidate }
  );

  return cached(normalizedPhrase, limit);
}

export { SearchLandingTimeoutError } from "@/lib/search/async-timeout";
