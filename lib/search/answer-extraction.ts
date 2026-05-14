import { buildSearchPath } from "@/lib/seo";
import { normalizeText } from "@/lib/youtube";

import type { SearchLandingMoment } from "@/lib/search/landing-types";

const CONFIDENCE_THRESHOLD = 0.58;
const MIN_RANGE_SECONDS = 15;
const MAX_RANGE_SECONDS = 30;
const DEFAULT_RANGE_SECONDS = 22;

const ANSWER_PATTERNS = [
  /\b(is|are|was|were)\b/i,
  /\b(means|meaning|defined as|stands for|refers to|known as|called)\b/i,
  /\b(basically|essentially|in other words|simply put)\b/i,
  /\b(you can|the way to|first step|to do this)\b/i,
  /\b(because|so that|the reason)\b/i,
];

const QUESTION_STARTERS = /^(what|who|where|when|why|how|is|are|can|does|do)\b/i;

export type AnswerConfidenceSignals = {
  termCoverage: number;
  retrievalScore: number;
  answerWording: number;
  segmentDensity: number;
};

export type ExtractedAnswerRange = {
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  startLabel: string;
  endLabel: string;
};

export type ExtractedAnswerResult = {
  mode: "answer" | "moments-only";
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  query: string;
  answerSnippet: string | null;
  sourceMoment: SearchLandingMoment | null;
  timestampRange: ExtractedAnswerRange | null;
  jumpUrl: string | null;
  supportingMoments: SearchLandingMoment[];
  relatedExplanations: Array<{ phrase: string; href: string }>;
  signals: AnswerConfidenceSignals | null;
};

function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function formatSecondsLabel(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12);
}

function termCoverageScore(query: string, text: string) {
  const queryTokens = tokenize(query).filter((token) => !QUESTION_STARTERS.test(token));
  if (queryTokens.length === 0) return 0;

  const haystack = text.toLowerCase();
  const hits = queryTokens.filter((token) => haystack.includes(token)).length;
  return hits / queryTokens.length;
}

function answerWordingScore(query: string, text: string) {
  const lower = text.toLowerCase();
  let score = 0;

  for (const pattern of ANSWER_PATTERNS) {
    if (pattern.test(lower)) score += 0.22;
  }

  const queryTokens = tokenize(query);
  const subjectTokens = queryTokens.filter((token) => !QUESTION_STARTERS.test(token));
  if (subjectTokens.length > 0) {
    const subject = subjectTokens.join(" ");
    if (lower.includes(subject)) score += 0.2;
    if (lower.includes(`${subjectTokens[0]} is`)) score += 0.25;
  }

  if (QUESTION_STARTERS.test(query.trim()) && splitSentences(text).length <= 4) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

function retrievalScore(moment: SearchLandingMoment, maxScore: number) {
  if (maxScore <= 0) return 0;
  return Math.min(moment.score / maxScore, 1);
}

function segmentDensityScore(moment: SearchLandingMoment, moments: SearchLandingMoment[]) {
  const nearby = moments.filter(
    (candidate) =>
      candidate.videoId === moment.videoId &&
      Math.abs(candidate.startSeconds - moment.startSeconds) <= 90
  ).length;

  const distinctVideos = new Set(
    moments
      .filter((candidate) => termCoverageScore(moment.snippet, candidate.snippet) >= 0.34)
      .map((candidate) => candidate.videoId)
  ).size;

  const proximity = Math.min(nearby / 4, 1) * 0.55;
  const breadth = Math.min(distinctVideos / 3, 1) * 0.45;
  return proximity + breadth;
}

function pickAnswerSnippet(query: string, snippet: string) {
  const sentences = splitSentences(snippet);
  if (sentences.length === 0) {
    const trimmed = normalizeText(snippet);
    return trimmed.length >= 20 ? trimmed : null;
  }

  let bestSentence = sentences[0];
  let bestScore = -1;

  for (const sentence of sentences) {
    const coverage = termCoverageScore(query, sentence);
    const wording = answerWordingScore(query, sentence);
    const score = coverage * 0.55 + wording * 0.45;
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  const startIndex = sentences.indexOf(bestSentence);
  let combined = bestSentence;
  if (startIndex >= 0 && combined.length < 180 && startIndex + 1 < sentences.length) {
    const next = sentences[startIndex + 1];
    if (combined.length + next.length + 1 <= 280) {
      combined = `${combined} ${next}`;
    }
  }

  if (!snippet.toLowerCase().includes(combined.toLowerCase().slice(0, 20))) {
    return bestSentence;
  }

  return combined;
}

function buildTimestampRange(startSeconds: number, snippet: string) {
  const wordCount = snippet.split(/\s+/).filter(Boolean).length;
  const durationSeconds = Math.max(
    MIN_RANGE_SECONDS,
    Math.min(MAX_RANGE_SECONDS, DEFAULT_RANGE_SECONDS + Math.floor(wordCount / 8))
  );

  return {
    startSeconds,
    endSeconds: startSeconds + durationSeconds,
    durationSeconds,
    startLabel: formatSecondsLabel(startSeconds),
    endLabel: formatSecondsLabel(startSeconds + durationSeconds),
  };
}

function buildJumpUrl(moment: SearchLandingMoment, range: ExtractedAnswerRange) {
  const base = moment.youtubeUrl.split("&t=")[0].split("?t=")[0];
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}t=${Math.floor(range.startSeconds)}`;
}

function confidenceLabel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.75) return "high";
  if (confidence >= CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

function scoreMoment(query: string, moment: SearchLandingMoment, moments: SearchLandingMoment[], maxScore: number) {
  const coverage = termCoverageScore(query, moment.snippet);
  const wording = answerWordingScore(query, moment.snippet);
  const retrieval = retrievalScore(moment, maxScore);
  const density = segmentDensityScore(moment, moments);

  const confidence = coverage * 0.34 + retrieval * 0.26 + wording * 0.24 + density * 0.16;

  return {
    moment,
    confidence,
    signals: {
      termCoverage: coverage,
      retrievalScore: retrieval,
      answerWording: wording,
      segmentDensity: density,
    },
  };
}

export function extractAnswerFromMoments(input: {
  query: string;
  moments: SearchLandingMoment[];
  relatedPhrases?: string[];
  peopleAlsoSearched?: Array<{ phrase: string; href: string }>;
}): ExtractedAnswerResult {
  const query = input.query.trim();
  const moments = input.moments;

  if (!query || moments.length === 0) {
    return {
      mode: "moments-only",
      confidence: 0,
      confidenceLabel: "low",
      query,
      answerSnippet: null,
      sourceMoment: null,
      timestampRange: null,
      jumpUrl: null,
      supportingMoments: [],
      relatedExplanations: [],
      signals: null,
    };
  }

  const maxScore = Math.max(...moments.map((moment) => moment.score), 1);
  const scored = moments
    .map((moment) => scoreMoment(query, moment, moments, maxScore))
    .sort((left, right) => right.confidence - left.confidence);

  const best = scored[0];
  const relatedExplanations = [
    ...(input.peopleAlsoSearched ?? []).slice(0, 6),
    ...(input.relatedPhrases ?? [])
      .filter((phrase) => phrase.toLowerCase() !== query.toLowerCase())
      .slice(0, 6)
      .map((phrase) => ({ phrase, href: buildSearchPath(phrase) })),
  ].filter(
    (item, index, array) =>
      array.findIndex((candidate) => candidate.phrase.toLowerCase() === item.phrase.toLowerCase()) ===
      index
  );

  if (best.confidence < CONFIDENCE_THRESHOLD) {
    return {
      mode: "moments-only",
      confidence: best.confidence,
      confidenceLabel: confidenceLabel(best.confidence),
      query,
      answerSnippet: null,
      sourceMoment: null,
      timestampRange: null,
      jumpUrl: null,
      supportingMoments: moments.slice(0, 8),
      relatedExplanations: relatedExplanations.slice(0, 8),
      signals: best.signals,
    };
  }

  const answerSnippet = pickAnswerSnippet(query, best.moment.snippet);
  if (!answerSnippet) {
    return {
      mode: "moments-only",
      confidence: best.confidence,
      confidenceLabel: confidenceLabel(best.confidence),
      query,
      answerSnippet: null,
      sourceMoment: null,
      timestampRange: null,
      jumpUrl: null,
      supportingMoments: moments.slice(0, 8),
      relatedExplanations: relatedExplanations.slice(0, 8),
      signals: best.signals,
    };
  }

  const timestampRange = buildTimestampRange(best.moment.startSeconds, answerSnippet);
  const jumpUrl = buildJumpUrl(best.moment, timestampRange);
  const supportingMoments = moments
    .filter(
      (moment) =>
        !(
          moment.videoId === best.moment.videoId &&
          Math.abs(moment.startSeconds - best.moment.startSeconds) < 3
        )
    )
    .slice(0, 6);

  return {
    mode: "answer",
    confidence: best.confidence,
    confidenceLabel: confidenceLabel(best.confidence),
    query,
    answerSnippet,
    sourceMoment: best.moment,
    timestampRange,
    jumpUrl,
    supportingMoments,
    relatedExplanations: relatedExplanations.slice(0, 8),
    signals: best.signals,
  };
}
