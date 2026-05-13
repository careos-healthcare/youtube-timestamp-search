import { NextResponse } from "next/server";
import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

import {
  buildYouTubeTimestampUrl,
  extractVideoId,
  formatTimestampFromMs,
  normalizeText,
  type TranscriptSearchResult,
} from "@/lib/youtube";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestLogByClient = new Map<string, number[]>();

type TranscriptEntry = {
  text: string;
  offset: number;
  duration: number;
};

function buildSnippet(entries: TranscriptEntry[], index: number) {
  const windowStart = Math.max(0, index - 1);
  const windowEnd = Math.min(entries.length - 1, index + 1);

  return normalizeText(
    entries
      .slice(windowStart, windowEnd + 1)
      .map((entry) => entry.text)
      .join(" ")
  );
}

function searchTranscript(
  entries: TranscriptEntry[],
  phrase: string,
  videoId: string
): TranscriptSearchResult[] {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const results: TranscriptSearchResult[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const snippet = buildSnippet(entries, index);
    if (!snippet.toLowerCase().includes(normalizedPhrase)) {
      continue;
    }

    const offsetMs = Math.max(0, Math.floor(entries[index]?.offset ?? 0));
    const lastResult = results.at(-1);
    if (lastResult && Math.abs(lastResult.offsetMs - offsetMs) < 3000) {
      continue;
    }

    results.push({
      offsetMs,
      timestamp: formatTimestampFromMs(offsetMs),
      snippet,
      openUrl: buildYouTubeTimestampUrl(videoId, offsetMs),
    });

    if (results.length >= 20) {
      break;
    }
  }

  return results;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
}

function isRateLimited(clientKey: string) {
  const now = Date.now();
  const recentRequests = (requestLogByClient.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLogByClient.set(clientKey, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLogByClient.set(clientKey, recentRequests);
  return false;
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request);
    if (isRateLimited(clientKey)) {
      return NextResponse.json(
        {
          code: "rate_limited",
          error: "Too many transcript searches right now.",
          detail: "Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { url?: string; phrase?: string };
    const url = body.url?.trim() ?? "";
    const phrase = body.phrase?.trim() ?? "";

    if (!url) {
      return NextResponse.json({ code: "missing_url", error: "Add a YouTube URL to search." }, { status: 400 });
    }

    if (!phrase) {
      return NextResponse.json({ code: "missing_phrase", error: "Add a search phrase to scan the transcript." }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { code: "invalid_url", error: "This does not look like a supported YouTube video URL." },
        { status: 400 }
      );
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const results = searchTranscript(transcript, phrase, videoId);

    return NextResponse.json({
      results,
      videoId,
      searchedPhrase: phrase,
      resultCount: results.length,
    });
  } catch (error) {
    if (error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError) {
      return NextResponse.json(
        {
          code: "transcript_unavailable",
          error: "This video does not expose searchable captions.",
          detail: "Try another public video with captions enabled.",
        },
        { status: 422 }
      );
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      return NextResponse.json(
        { code: "video_unavailable", error: "This video is unavailable or cannot be read right now." },
        { status: 404 }
      );
    }

    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return NextResponse.json(
        {
          code: "youtube_rate_limited",
          error: "YouTube is rate limiting transcript requests.",
          detail: "Please try again shortly.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        code: "search_failed",
        error: "Transcript search failed.",
        detail: "Try a different video or search phrase.",
      },
      { status: 500 }
    );
  }
}
