import { normalizeText } from "@/lib/youtube";

import { getSearchRuntimeConfig } from "@/lib/search/search-config";
import type {
  HybridRankingBreakdown,
  IndexedTranscriptMatch,
  IndexedTranscriptSearchResult,
  SemanticSearchHit,
} from "@/lib/search/types";

export type RankableMoment = {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  category?: string;
  topic?: string;
  creatorName?: string;
  match: IndexedTranscriptMatch;
  keywordScore: number;
  semanticScore: number;
  ranking: HybridRankingBreakdown;
};

function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function metadataBoost(query: string, result: Pick<IndexedTranscriptSearchResult, "title" | "topic" | "category" | "creatorName" | "channelName">) {
  const config = getSearchRuntimeConfig();
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;

  const fields = [result.title, result.topic, result.category, result.creatorName, result.channelName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const token of queryTokens) {
    if (fields.includes(token)) hits += 1;
  }

  return Math.min(hits, 4) * (config.titleMetadataBoost / 4);
}

function exactPhraseBoost(query: string, snippet: string) {
  const config = getSearchRuntimeConfig();
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) return 0;
  return snippet.toLowerCase().includes(normalizedQuery) ? config.exactPhraseBoost : 0;
}

function snippetFingerprint(snippet: string) {
  return normalizeText(snippet).toLowerCase().replace(/\s+/g, " ").trim();
}

function isNearDuplicate(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.min(leftTokens.size, rightTokens.size);
  return ratio >= 0.82;
}

export function buildRankableMoments(
  query: string,
  keywordResults: IndexedTranscriptSearchResult[],
  semanticHits: SemanticSearchHit[]
): RankableMoment[] {
  const config = getSearchRuntimeConfig();
  const semanticByKey = new Map<string, number>();

  for (const hit of semanticHits) {
    const key = `${hit.videoId}:${hit.startSeconds}`;
    semanticByKey.set(key, Math.max(semanticByKey.get(key) ?? 0, hit.similarity));
  }

  const moments: RankableMoment[] = [];

  for (const result of keywordResults) {
    for (const match of result.matches) {
      const semanticScore = semanticByKey.get(`${result.videoId}:${match.start}`) ?? 0;
      const keywordScore = result.score;
      const phraseBoost = exactPhraseBoost(query, match.snippet);
      const metaBoost = metadataBoost(query, result);
      const finalScore =
        keywordScore + phraseBoost + metaBoost + semanticScore * config.semanticWeight;

      moments.push({
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        title: result.title,
        channelName: result.channelName,
        category: result.category,
        topic: result.topic,
        creatorName: result.creatorName,
        match,
        keywordScore,
        semanticScore,
        ranking: {
          keywordScore,
          semanticScore,
          exactPhraseBoost: phraseBoost,
          metadataBoost: metaBoost,
          finalScore,
        },
      });
    }
  }

  for (const hit of semanticHits) {
    const key = `${hit.videoId}:${hit.startSeconds}`;
    if (moments.some((moment) => `${moment.videoId}:${moment.match.start}` === key)) {
      continue;
    }

    const semanticScore = hit.similarity;
    const finalScore = semanticScore * config.semanticWeight;

    moments.push({
      videoId: hit.videoId,
      videoUrl: `https://www.youtube.com/watch?v=${hit.videoId}`,
      match: {
        start: hit.startSeconds,
        timestamp: formatSeconds(hit.startSeconds),
        snippet: hit.snippet,
        text: hit.text,
      },
      keywordScore: 0,
      semanticScore,
      ranking: {
        keywordScore: 0,
        semanticScore,
        exactPhraseBoost: 0,
        metadataBoost: 0,
        finalScore,
      },
    });
  }

  return moments.sort((left, right) => right.ranking.finalScore - left.ranking.finalScore);
}

function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function applyHybridDiversity(moments: RankableMoment[]) {
  const config = getSearchRuntimeConfig();
  const selected: RankableMoment[] = [];
  const fingerprints = new Set<string>();
  const perVideo = new Map<string, number>();
  const perChannel = new Map<string, number>();
  const perVideoTimestamps = new Map<string, number[]>();

  for (const moment of moments) {
    const fingerprint = snippetFingerprint(moment.match.snippet);
    if (fingerprints.has(fingerprint)) {
      continue;
    }

    let duplicate = false;
    for (const existing of selected) {
      if (isNearDuplicate(existing.match.snippet, moment.match.snippet)) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;

    const videoCount = perVideo.get(moment.videoId) ?? 0;
    if (videoCount >= config.maxMomentsPerVideo) continue;

    const channelKey = (moment.channelName ?? moment.creatorName ?? "unknown").toLowerCase();
    const channelCount = perChannel.get(channelKey) ?? 0;
    if (channelCount >= config.maxMomentsPerChannel) continue;

    const timestamps = perVideoTimestamps.get(moment.videoId) ?? [];
    if (
      timestamps.some(
        (start) => Math.abs(start - moment.match.start) < config.minTimestampGapSeconds
      )
    ) {
      continue;
    }

    selected.push(moment);
    fingerprints.add(fingerprint);
    perVideo.set(moment.videoId, videoCount + 1);
    perChannel.set(channelKey, channelCount + 1);
    perVideoTimestamps.set(moment.videoId, [...timestamps, moment.match.start]);
  }

  return selected;
}

export function regroupRankedMoments(moments: RankableMoment[]): IndexedTranscriptSearchResult[] {
  const grouped = new Map<string, IndexedTranscriptSearchResult>();

  for (const moment of moments) {
    const existing = grouped.get(moment.videoId);
    if (!existing) {
      grouped.set(moment.videoId, {
        videoId: moment.videoId,
        videoUrl: moment.videoUrl,
        title: moment.title,
        channelName: moment.channelName,
        category: moment.category,
        topic: moment.topic,
        creatorName: moment.creatorName,
        score: moment.ranking.finalScore,
        matches: [moment.match],
        ranking: moment.ranking,
      });
      continue;
    }

    existing.score = Math.max(existing.score, moment.ranking.finalScore);
    if (existing.matches.length < 5) {
      existing.matches.push(moment.match);
    }
  }

  return [...grouped.values()].sort(
    (left, right) => right.score - left.score || right.matches.length - left.matches.length
  );
}

export function rankIndexedResults(
  query: string,
  keywordResults: IndexedTranscriptSearchResult[],
  semanticHits: SemanticSearchHit[],
  momentLimit = 40
) {
  const rankable = buildRankableMoments(query, keywordResults, semanticHits);
  const diversified = applyHybridDiversity(rankable).slice(0, momentLimit);
  return {
    moments: diversified,
    results: regroupRankedMoments(diversified),
  };
}
