import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type TranscriptResponse,
} from "youtube-transcript";

import type { TranscriptLine } from "@/lib/transcript-types";

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

export async function fetchTranscriptByVideoId(videoId: string): Promise<TranscriptLine[]> {
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
