import { getIndexedVideoById } from "@/lib/indexed-videos";
import { enqueueCandidates, loadQueue } from "@/lib/ingestion-queue";
import { hybridFindMatches } from "@/lib/search/per-video-hybrid-search";
import { applyHybridDiversity, buildRankableMoments } from "@/lib/search/hybrid-ranking";
import { fetchTranscriptByVideoId, TranscriptFetchError } from "@/lib/transcript-service";
import { hasCachedTranscript, getCachedTranscript } from "@/lib/transcript-cache";
import { buildMomentPath, getSiteUrl } from "@/lib/seo";
import { extractYouTubeVideoId, getYouTubeWatchUrl, normalizeText } from "@/lib/youtube";

export type ExtensionMoment = {
  startSeconds: number;
  timestamp: string;
  snippet: string;
  confidence: number;
  youtubeUrl: string;
  momentPageUrl: string;
};

export type ExtensionVideoSearchResult = {
  videoId: string;
  query: string;
  indexed: boolean;
  source: "cache" | "live";
  title?: string;
  channelName?: string;
  moments: ExtensionMoment[];
  resultCount: number;
};

export type ExtensionIndexStatus = {
  videoId: string;
  indexed: boolean;
  segmentCount: number;
  title?: string;
  channelName?: string;
  fetchedAt?: string;
  indexPending: boolean;
  queueJobId?: string;
};

export type ExtensionIndexRequestResult = {
  videoId: string;
  status: "already_indexed" | "queued" | "already_queued";
  jobId?: string;
  message: string;
};

export function resolveExtensionVideoId(input: { videoId?: string; url?: string }) {
  const direct = input.videoId?.trim();
  if (direct && /^[a-zA-Z0-9_-]{6,}$/.test(direct)) {
    return direct;
  }

  const url = input.url?.trim();
  if (url) {
    return extractYouTubeVideoId(url);
  }

  return null;
}

function normalizeConfidence(finalScore: number) {
  return Math.max(0, Math.min(Number((finalScore / 28).toFixed(3)), 1));
}

export async function getExtensionVideoIndexStatus(videoId: string): Promise<ExtensionIndexStatus> {
  const indexedVideo = await getIndexedVideoById(videoId);
  const queue = loadQueue();
  const pendingJob = queue.jobs.find(
    (job) =>
      job.videoId === videoId &&
      (job.status === "pending" || job.status === "processing" || job.status === "failed")
  );

  if (indexedVideo) {
    return {
      videoId,
      indexed: true,
      segmentCount: indexedVideo.segmentCount,
      title: indexedVideo.title,
      channelName: indexedVideo.channelName,
      fetchedAt: indexedVideo.fetchedAt,
      indexPending: Boolean(pendingJob),
      queueJobId: pendingJob?.id,
    };
  }

  const cached = await hasCachedTranscript(videoId);

  if (cached) {
    const transcript = await getCachedTranscript(videoId);
    return {
      videoId,
      indexed: true,
      segmentCount: transcript?.segments.length ?? 0,
      title: transcript?.title,
      channelName: transcript?.channelName,
      fetchedAt: transcript?.fetchedAt,
      indexPending: Boolean(pendingJob),
      queueJobId: pendingJob?.id,
    };
  }

  return {
    videoId,
    indexed: false,
    segmentCount: 0,
    indexPending: Boolean(pendingJob),
    queueJobId: pendingJob?.id,
  };
}

export async function requestExtensionVideoIndex(
  videoId: string,
  url?: string
): Promise<ExtensionIndexRequestResult> {
  const status = await getExtensionVideoIndexStatus(videoId);
  if (status.indexed) {
    return {
      videoId,
      status: "already_indexed",
      message: "Video transcript is already indexed and searchable.",
    };
  }

  const queue = loadQueue();
  const existing = queue.jobs.find(
    (job) =>
      job.videoId === videoId &&
      (job.status === "pending" || job.status === "processing" || job.status === "failed")
  );

  if (existing) {
    return {
      videoId,
      status: "already_queued",
      jobId: existing.id,
      message: "Indexing request is already queued.",
    };
  }

  const result = await enqueueCandidates(
    [{ url: url ?? getYouTubeWatchUrl(videoId), priority: 5 }],
    { source: "extension-api" }
  );

  if (result.added === 0) {
    const refreshed = await getExtensionVideoIndexStatus(videoId);
    if (refreshed.indexed) {
      return {
        videoId,
        status: "already_indexed",
        message: "Video became indexed while processing the request.",
      };
    }

    const queued = loadQueue().jobs.find((job) => job.videoId === videoId);
    return {
      videoId,
      status: "already_queued",
      jobId: queued?.id,
      message: "Video is already in the ingestion pipeline.",
    };
  }

  const job = loadQueue().jobs.find((job) => job.videoId === videoId);

  return {
    videoId,
    status: "queued",
    jobId: job?.id,
    message: "Video queued for transcript indexing.",
  };
}

export async function searchExtensionVideo(
  videoId: string,
  query: string
): Promise<ExtensionVideoSearchResult> {
  const trimmedQuery = normalizeText(query);
  if (!trimmedQuery) {
    throw new ExtensionApiError("missing_query", "A search query is required.", 400);
  }

  const indexStatus = await getExtensionVideoIndexStatus(videoId);
  const wasCached = indexStatus.indexed || (await hasCachedTranscript(videoId));

  let transcript;
  try {
    transcript = await fetchTranscriptByVideoId(videoId);
  } catch (error) {
    if (error instanceof TranscriptFetchError) {
      throw new ExtensionApiError(
        "transcript_unavailable",
        error.message,
        error.message.includes("Private") ? 404 : 422
      );
    }
    throw new ExtensionApiError("search_failed", "Transcript search failed.", 500);
  }

  const indexedVideo = await getIndexedVideoById(videoId);
  const matches = hybridFindMatches(videoId, transcript, trimmedQuery);

  const keywordResults = [
    {
      videoId,
      videoUrl: getYouTubeWatchUrl(videoId),
      score: matches.length * 3,
      matches: matches.map((match) => ({
        start: match.start,
        timestamp: match.timestamp,
        snippet: match.snippet,
        text: match.snippet,
      })),
    },
  ];

  const ranked = applyHybridDiversity(buildRankableMoments(trimmedQuery, keywordResults, []));

  const moments: ExtensionMoment[] = ranked.map((moment) => ({
    startSeconds: moment.match.start,
    timestamp: moment.match.timestamp,
    snippet: moment.match.snippet,
    confidence: normalizeConfidence(moment.ranking.finalScore),
    youtubeUrl: getYouTubeWatchUrl(videoId, moment.match.start),
    momentPageUrl: `${getSiteUrl()}${buildMomentPath(videoId, trimmedQuery)}`,
  }));

  return {
    videoId,
    query: trimmedQuery,
    indexed: indexStatus.indexed || wasCached,
    source: wasCached ? "cache" : "live",
    title: indexedVideo?.title,
    channelName: indexedVideo?.channelName,
    moments,
    resultCount: moments.length,
  };
}

export class ExtensionApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ExtensionApiError";
    this.code = code;
    this.status = status;
  }
}

export function extensionErrorResponse(error: unknown) {
  if (error instanceof ExtensionApiError) {
    return {
      status: error.status,
      body: { code: error.code, error: error.message },
    };
  }

  return {
    status: 500,
    body: { code: "internal_error", error: "Extension API request failed." },
  };
}
