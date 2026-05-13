import { NextResponse } from "next/server";
import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type TranscriptResponse,
} from "youtube-transcript";

import { extractYouTubeVideoId } from "@/lib/youtube";

interface TranscriptCaption {
  text: string;
  start: number;
  duration: number;
}

function toSeconds(milliseconds: number) {
  return Number((Math.max(0, milliseconds) / 1000).toFixed(1));
}

function mapTranscript(transcript: TranscriptResponse[]): TranscriptCaption[] {
  return transcript
    .map((entry) => ({
      text: entry.text.trim(),
      start: toSeconds(entry.offset),
      duration: toSeconds(entry.duration),
    }))
    .filter((entry) => entry.text.length > 0);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim() ?? "";

    if (!url) {
      return NextResponse.json({ error: "A YouTube URL is required." }, { status: 400 });
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 });
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const mappedTranscript = mapTranscript(transcript);

    if (mappedTranscript.length === 0) {
      return NextResponse.json(
        { error: "Transcript unavailable for this video." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      videoId,
      transcript: mappedTranscript,
    });
  } catch (error) {
    if (
      error instanceof YoutubeTranscriptDisabledError ||
      error instanceof YoutubeTranscriptNotAvailableError
    ) {
      return NextResponse.json(
        { error: "Transcript unavailable for this video." },
        { status: 422 }
      );
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      return NextResponse.json(
        { error: "Private or unavailable video." },
        { status: 404 }
      );
    }

    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return NextResponse.json(
        { error: "Transcript unavailable for this video." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Transcript unavailable for this video." },
      { status: 500 }
    );
  }
}
