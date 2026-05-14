import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type TranscriptResponse,
} from "youtube-transcript";

import { trackServerEvent } from "@/lib/analytics";
import {
  buildCachedTranscriptPayload,
  getCachedTranscript,
  saveTranscript,
  segmentsToTranscriptLines,
} from "@/lib/transcript-cache";
import type { TranscriptLine } from "@/lib/transcript-types";
import { fetchVideoOEmbedMetadata } from "@/lib/video-metadata";

function toSeconds(milliseconds: number) {
  return Number((Math.max(0, milliseconds) / 1000).toFixed(1));
}

function mapTranscript(transcript: TranscriptResponse[]): TranscriptLine[] {
  return transcript
    .map((entry) => ({
      text: entry.text.trim(),
      start: toSeconds(entry.offset),
      duration: toSeconds(entry.duration),
    }))
    .filter((entry) => entry.text.length > 0);
}

export class TranscriptFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptFetchError";
  }
}

export async function fetchTranscriptFromYoutube(videoId: string): Promise<TranscriptLine[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const mappedTranscript = mapTranscript(transcript);

    if (mappedTranscript.length === 0) {
      throw new TranscriptFetchError("Transcript unavailable for this video.");
    }

    return mappedTranscript;
  } catch (error) {
    if (
      error instanceof YoutubeTranscriptDisabledError ||
      error instanceof YoutubeTranscriptNotAvailableError ||
      error instanceof YoutubeTranscriptTooManyRequestError
    ) {
      throw new TranscriptFetchError("Transcript unavailable for this video.");
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new TranscriptFetchError("Private or unavailable video.");
    }

    if (error instanceof TranscriptFetchError) {
      throw error;
    }

    throw new TranscriptFetchError("Transcript unavailable for this video.");
  }
}

async function cacheTranscript(videoId: string, lines: TranscriptLine[]) {
  const metadata = await fetchVideoOEmbedMetadata(videoId);
  const payload = buildCachedTranscriptPayload(videoId, lines, metadata);
  await saveTranscript(videoId, payload);
  trackServerEvent("transcript_saved_to_cache", {
    videoId,
    segmentCount: lines.length,
    hasTitle: Boolean(metadata.title),
  });
}

export async function fetchTranscriptByVideoId(videoId: string): Promise<TranscriptLine[]> {
  const cached = await getCachedTranscript(videoId);
  if (cached && cached.segments.length > 0) {
    trackServerEvent("transcript_cache_hit", { videoId });
    return segmentsToTranscriptLines(cached.segments);
  }

  trackServerEvent("transcript_cache_miss", { videoId });
  const lines = await fetchTranscriptFromYoutube(videoId);
  void cacheTranscript(videoId, lines);
  return lines;
}

export async function getTranscriptForVideo(videoId: string) {
  const cached = await getCachedTranscript(videoId);
  if (cached) {
    return {
      lines: segmentsToTranscriptLines(cached.segments),
      metadata: {
        title: cached.title,
        channelName: cached.channelName,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
      },
    };
  }

  try {
    const lines = await fetchTranscriptByVideoId(videoId);
    const refreshed = await getCachedTranscript(videoId);
    return {
      lines,
      metadata: {
        title: refreshed?.title,
        channelName: refreshed?.channelName,
        fetchedAt: refreshed?.fetchedAt,
        fromCache: false,
      },
    };
  } catch (error) {
    if (error instanceof TranscriptFetchError) {
      throw error;
    }
    throw new TranscriptFetchError("Transcript unavailable for this video.");
  }
}
