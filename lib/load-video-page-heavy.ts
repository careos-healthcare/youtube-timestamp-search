import { extractBestMoments } from "@/lib/best-moments";
import { getChannelCorpusMoments } from "@/lib/channel-corpus-search";
import type { IndexedVideo } from "@/lib/indexed-videos";
import { getRelatedIndexedVideos } from "@/lib/indexed-videos";
import { buildInternalLinkGraph } from "@/lib/internal-linking";
import { raceWithTimeout, SearchLandingTimeoutError } from "@/lib/search/async-timeout";
import { suggestKeywords } from "@/lib/transcript-search";
import { getTranscriptForVideo, TranscriptFetchError } from "@/lib/transcript-service";
import type { TranscriptLine } from "@/lib/transcript-types";
import { getRelatedTopicsForKeywords } from "@/lib/video-related-links";
import {
  readVideoPageDataBudgetMs,
  readVideoPageMaxTranscriptSegments,
  readVideoPageProcessingSegmentCap,
} from "@/lib/video-page-budgets";
import { recordVideoPageDiagnostics } from "@/lib/video-page-diagnostics";
import {
  buildSearchableMoments,
  buildTranscriptPreviewSections,
} from "@/lib/video-landing";

export type VideoPageHeavyPayload = {
  transcript: TranscriptLine[];
  transcriptError: string;
  title?: string;
  channelName?: string;
  fetchedAt?: string;
  fromCache: boolean;
  suggestions: string[];
  relatedTopics: ReturnType<typeof getRelatedTopicsForKeywords>;
  relatedVideos: IndexedVideo[];
  previewSections: ReturnType<typeof buildTranscriptPreviewSections>;
  searchableMoments: ReturnType<typeof buildSearchableMoments>;
  bestMoments: ReturnType<typeof extractBestMoments>;
  channelMoments: Awaited<ReturnType<typeof getChannelCorpusMoments>>;
  internalLinks: ReturnType<typeof buildInternalLinkGraph>;
  timedOut: boolean;
  fallbackReason: string | null;
  showSlowOrPartialBanner: boolean;
  segmentCountReported: number;
};

async function maybeRace<T>(promise: Promise<T>, budgetMs: number | null, label: string, fallback: T): Promise<T> {
  if (budgetMs == null || budgetMs <= 0) {
    return promise;
  }
  try {
    return await raceWithTimeout(promise, budgetMs, label);
  } catch {
    return fallback;
  }
}

async function computePayload(videoId: string, indexed: IndexedVideo | null): Promise<VideoPageHeavyPayload> {
  const maxSegments = readVideoPageMaxTranscriptSegments();
  const procCap = readVideoPageProcessingSegmentCap();
  const onVercel = typeof process !== "undefined" && process.env.VERCEL === "1";

  let transcript: TranscriptLine[] = [];
  let transcriptError = "";
  let title: string | undefined;
  let channelName: string | undefined;
  let fetchedAt: string | undefined;
  let fromCache = false;

  try {
    const result = await getTranscriptForVideo(videoId, { maxSegments });
    transcript = result.lines;
    title = result.metadata.title;
    channelName = result.metadata.channelName;
    fetchedAt = result.metadata.fetchedAt;
    fromCache = result.metadata.fromCache;
  } catch (error) {
    transcriptError =
      error instanceof TranscriptFetchError
        ? error.message
        : "Transcript unavailable for this video.";
  }

  title = title ?? indexed?.title;
  channelName = channelName ?? indexed?.channelName;
  fetchedAt = fetchedAt ?? indexed?.fetchedAt;

  const totalSegmentsKnown = indexed?.segmentCount ?? transcript.length;
  const storeLikelyTruncated =
    transcript.length > 0 &&
    transcript.length === maxSegments &&
    (indexed == null || indexed.segmentCount > maxSegments);

  const processingTruncated = transcript.length > procCap;
  const processingTranscript =
    transcript.length > procCap ? transcript.slice(0, procCap) : transcript;

  const suggestions = transcriptError
    ? []
    : suggestKeywords(processingTranscript, "", 10);
  const relatedTopics = transcriptError ? [] : getRelatedTopicsForKeywords(suggestions, 8);

  const relatedVideos = transcriptError
    ? []
    : await maybeRace(
        getRelatedIndexedVideos(videoId, 4),
        onVercel ? 2200 : null,
        "video_related_videos",
        []
      );

  const previewSections = transcriptError
    ? []
    : buildTranscriptPreviewSections(processingTranscript, {
        linesPerSection: 12,
        maxSections: 8,
      });

  const searchableMoments = transcriptError
    ? []
    : buildSearchableMoments(videoId, processingTranscript, suggestions, 8);

  const bestMoments = transcriptError ? [] : extractBestMoments(videoId, processingTranscript, 8);

  const channelPhrase = suggestions[0] ?? title ?? "highlights";
  const channelMoments =
    transcriptError || !channelName || processingTranscript.length === 0
      ? []
      : await maybeRace(
          getChannelCorpusMoments(channelName, channelPhrase, {
            excludeVideoId: videoId,
            limit: 6,
          }),
          onVercel ? 2800 : null,
          "video_channel_moments",
          []
        );

  const internalLinks = buildInternalLinkGraph({
    phrase: title ?? videoId,
    videoKeywords: suggestions,
    topVideos: relatedVideos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
    })),
  });

  const showSlowOrPartialBanner = Boolean(storeLikelyTruncated || processingTruncated);

  return {
    transcript,
    transcriptError,
    title,
    channelName,
    fetchedAt,
    fromCache,
    suggestions,
    relatedTopics,
    relatedVideos,
    previewSections,
    searchableMoments,
    bestMoments,
    channelMoments,
    internalLinks,
    timedOut: false,
    fallbackReason: null,
    showSlowOrPartialBanner,
    segmentCountReported: totalSegmentsKnown,
  };
}

function emptyTimeoutPayload(videoId: string, indexed: IndexedVideo | null): VideoPageHeavyPayload {
  return {
    transcript: [],
    transcriptError: "",
    title: indexed?.title,
    channelName: indexed?.channelName,
    fetchedAt: indexed?.fetchedAt,
    fromCache: false,
    suggestions: [],
    relatedTopics: [],
    relatedVideos: [],
    previewSections: [],
    searchableMoments: [],
    bestMoments: [],
    channelMoments: [],
    internalLinks: buildInternalLinkGraph({
      phrase: indexed?.title ?? videoId,
      videoKeywords: [],
      topVideos: [],
    }),
    timedOut: true,
    fallbackReason: "timeout",
    showSlowOrPartialBanner: true,
    segmentCountReported: indexed?.segmentCount ?? 0,
  };
}

function buildVideoPageErrorPayload(videoId: string, indexed: IndexedVideo | null): VideoPageHeavyPayload {
  return {
    ...emptyTimeoutPayload(videoId, indexed),
    timedOut: false,
    transcriptError: "Unable to load transcript sections right now. You can still use the search box above.",
    fallbackReason: "error",
    showSlowOrPartialBanner: false,
  };
}

export async function loadVideoPageHeavyPayload(
  videoId: string,
  indexed: IndexedVideo | null
): Promise<VideoPageHeavyPayload> {
  const t0 = Date.now();
  const finish = (payload: VideoPageHeavyPayload) => {
    recordVideoPageDiagnostics({
      videoId,
      segmentCount: payload.segmentCountReported,
      loadDurationMs: Date.now() - t0,
      timedOut: payload.timedOut,
      fallbackReason: payload.fallbackReason,
    });
    return payload;
  };

  const budgetMs = readVideoPageDataBudgetMs();

  try {
    const data = await raceWithTimeout(computePayload(videoId, indexed), budgetMs, "video_page_heavy");
    return finish(data);
  } catch (error) {
    if (error instanceof SearchLandingTimeoutError) {
      return finish(emptyTimeoutPayload(videoId, indexed));
    }
    console.error("[video-page] heavy_load_failed", {
      videoId,
      message: error instanceof Error ? error.message : String(error),
    });
    return finish(buildVideoPageErrorPayload(videoId, indexed));
  }
}
