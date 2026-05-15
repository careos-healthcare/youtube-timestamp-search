import { searchSupabaseTranscripts } from "@/lib/transcript-cache-supabase";
import {
  getCachedTranscript,
  listCachedTranscripts,
  type CachedTranscriptSegment,
} from "@/lib/transcript-cache";
import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";
import { formatTimestampFromMs, getYouTubeWatchUrl, normalizeText } from "@/lib/youtube";

import {
  maxLocalTranscriptVideosToScan,
  maxSegmentsToScanPerVideo,
} from "@/lib/search/build-corpus-caps";
import type { IndexedTranscriptSearchResult } from "@/lib/search/types";

function buildSnippet(segments: CachedTranscriptSegment[], index: number) {
  const start = Math.max(0, index - 1);
  const end = Math.min(segments.length - 1, index + 1);
  return normalizeText(
    segments
      .slice(start, end + 1)
      .map((segment) => segment.text)
      .join(" ")
  );
}

async function searchLocalKeywordTranscripts(
  query: string,
  limit = 20
): Promise<IndexedTranscriptSearchResult[]> {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const summaries = await listCachedTranscripts();
  const videoCap = maxLocalTranscriptVideosToScan();
  const cappedSummaries =
    videoCap != null && summaries.length > videoCap ? summaries.slice(0, videoCap) : summaries;
  const segmentScanCap = maxSegmentsToScanPerVideo();
  const results: IndexedTranscriptSearchResult[] = [];

  for (const summary of cappedSummaries) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached || cached.segments.length === 0) {
      continue;
    }

    const matches: IndexedTranscriptSearchResult["matches"] = [];
    let score = 0;

    const maxIndex =
      segmentScanCap != null ? Math.min(cached.segments.length - 1, segmentScanCap - 1) : cached.segments.length - 1;

    for (let index = 0; index <= maxIndex; index += 1) {
      const segment = cached.segments[index];
      const snippet = buildSnippet(cached.segments, index);
      const haystack = snippet.toLowerCase();

      const phraseHit = haystack.includes(normalizedQuery);
      const termHits = terms.filter((term) => haystack.includes(term)).length;
      if (!phraseHit && termHits === 0) {
        continue;
      }

      const matchScore = phraseHit ? 10 + termHits : termHits;
      score += matchScore;

      const previous = matches.at(-1);
      if (previous && Math.abs(previous.start - segment.start) < 3) {
        continue;
      }

      matches.push({
        start: segment.start,
        timestamp: formatTimestampFromMs(segment.start * 1000),
        snippet,
        text: segment.text,
      });

      if (matches.length >= 5) {
        break;
      }
    }

    if (matches.length === 0) {
      continue;
    }

    results.push({
      videoId: cached.videoId,
      videoUrl: cached.videoUrl || getYouTubeWatchUrl(cached.videoId),
      title: cached.title,
      channelName: cached.channelName,
      category: cached.category,
      topic: cached.topic,
      creatorName: cached.creatorName,
      score,
      matches,
    });
  }

  return results
    .sort((left, right) => right.score - left.score || right.matches.length - left.matches.length)
    .slice(0, limit);
}

export async function searchKeywordTranscripts(
  query: string,
  limit = 20
): Promise<IndexedTranscriptSearchResult[]> {
  if (isSupabaseTranscriptStoreConfigured()) {
    const supabaseResults = await searchSupabaseTranscripts(query, limit);
    if (supabaseResults.length > 0) {
      return supabaseResults;
    }
  }

  return searchLocalKeywordTranscripts(query, limit);
}
