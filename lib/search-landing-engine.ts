import { searchCachedTranscripts, type IndexedTranscriptSearchResult } from "@/lib/transcript-cache";
import { getRelatedSearchPhrases } from "@/lib/internal-linking";
import { buildMomentPath, buildVideoPath } from "@/lib/seo";
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
};

export type SearchLandingData = {
  phrase: string;
  moments: SearchLandingMoment[];
  videoCount: number;
  relatedPhrases: string[];
  topVideos: Array<{
    videoId: string;
    title: string;
    channelName?: string;
    videoPath: string;
    matchCount: number;
  }>;
};

function flattenResults(
  results: IndexedTranscriptSearchResult[],
  phrase: string
): SearchLandingMoment[] {
  const moments: SearchLandingMoment[] = [];

  for (const result of results) {
    for (const match of result.matches) {
      moments.push({
        videoId: result.videoId,
        videoTitle: result.title ?? `Video ${result.videoId}`,
        channelName: result.channelName,
        timestamp: match.timestamp,
        startSeconds: match.start,
        snippet: match.snippet,
        momentPath: buildMomentPath(result.videoId, phrase),
        youtubeUrl: getYouTubeWatchUrl(result.videoId, match.start),
        videoPath: buildVideoPath(result.videoId),
        score: result.score,
      });
    }
  }

  return moments.sort((a, b) => b.score - a.score || a.startSeconds - b.startSeconds);
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

export async function getSearchLandingData(phrase: string, limit = 40): Promise<SearchLandingData> {
  const trimmed = phrase.trim();
  const results = await searchCachedTranscripts(trimmed, 25);
  const moments = flattenResults(results, trimmed).slice(0, limit);
  const relatedPhrases = getRelatedSearchPhrases(trimmed, 12);

  return {
    phrase: trimmed,
    moments,
    videoCount: results.length,
    relatedPhrases,
    topVideos: buildTopVideos(results),
  };
}
