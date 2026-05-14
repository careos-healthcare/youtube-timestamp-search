import { buildMomentPath, buildVideoPath } from "@/lib/seo";
import { hybridSearchTranscripts } from "@/lib/search/hybrid-search-engine";
import { getPeopleAlsoSearched, getRelatedIntentGroups } from "@/lib/search/related-intent";
import type { IndexedTranscriptSearchResult } from "@/lib/search/types";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type SearchLandingMoment = {
  videoId: string;
  videoTitle: string;
  channelName?: string;
  timestamp: string;
  startSeconds: number;
  snippet: string;
  momentPath: string;
  youtubeUrl: string;
  videoPath: string;
  score: number;
  ranking?: {
    keywordScore: number;
    semanticScore: number;
    exactPhraseBoost: number;
    metadataBoost: number;
    finalScore: number;
  };
};

export type SearchLandingData = {
  phrase: string;
  moments: SearchLandingMoment[];
  videoCount: number;
  relatedPhrases: string[];
  peopleAlsoSearched: Array<{ phrase: string; href: string; score: number }>;
  relatedIntentGroups: ReturnType<typeof getRelatedIntentGroups>;
  searchMode: string;
  topVideos: Array<{
    videoId: string;
    title: string;
    channelName?: string;
    videoPath: string;
    matchCount: number;
  }>;
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

export async function getSearchLandingData(phrase: string, limit = 40): Promise<SearchLandingData> {
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

  return {
    phrase: trimmed,
    moments,
    videoCount: hybrid.results.length,
    relatedPhrases: peopleAlsoSearched.map((item) => item.phrase),
    peopleAlsoSearched,
    relatedIntentGroups: getRelatedIntentGroups(trimmed),
    searchMode: hybrid.diagnostics.mode,
    topVideos: buildTopVideos(hybrid.results),
  };
}
