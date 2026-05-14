import { searchCachedTranscripts } from "@/lib/transcript-cache";
import { buildMomentPath, buildVideoPath } from "@/lib/seo";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type ChannelMoment = {
  videoId: string;
  videoTitle: string;
  channelName: string;
  timestamp: string;
  startSeconds: number;
  snippet: string;
  momentPath: string;
  youtubeUrl: string;
  videoPath: string;
};

export async function getChannelCorpusMoments(
  channelName: string,
  phrase: string,
  options?: { excludeVideoId?: string; limit?: number }
): Promise<ChannelMoment[]> {
  const trimmedChannel = channelName.trim();
  const trimmedPhrase = phrase.trim();
  if (!trimmedChannel || !trimmedPhrase) return [];

  const results = await searchCachedTranscripts(trimmedPhrase, 30);
  const moments: ChannelMoment[] = [];

  for (const result of results) {
    if (result.channelName?.toLowerCase() !== trimmedChannel.toLowerCase()) continue;
    if (options?.excludeVideoId && result.videoId === options.excludeVideoId) continue;

    for (const match of result.matches) {
      moments.push({
        videoId: result.videoId,
        videoTitle: result.title ?? result.videoId,
        channelName: result.channelName ?? trimmedChannel,
        timestamp: match.timestamp,
        startSeconds: match.start,
        snippet: match.snippet,
        momentPath: buildMomentPath(result.videoId, trimmedPhrase),
        youtubeUrl: getYouTubeWatchUrl(result.videoId, match.start),
        videoPath: buildVideoPath(result.videoId),
      });
    }
  }

  return moments
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .slice(0, options?.limit ?? 8);
}
