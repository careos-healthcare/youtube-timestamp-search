import { NextResponse } from "next/server";

import { fetchTranscriptByVideoId, TranscriptFetchError } from "@/lib/transcript-service";
import { extractYouTubeVideoId } from "@/lib/youtube";

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

    const transcript = await fetchTranscriptByVideoId(videoId);

    return NextResponse.json({
      videoId,
      transcript,
    });
  } catch (error) {
    if (error instanceof TranscriptFetchError) {
      const status =
        error.message === "Private or unavailable video."
          ? 404
          : 422;

      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Transcript unavailable for this video." },
      { status: 500 }
    );
  }
}
