import { extractAnswerFromMoments, type ExtractedAnswerResult } from "@/lib/search/answer-extraction";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { normalizeText } from "@/lib/youtube";

export type TieredExplanation = {
  label: string;
  tier: "direct" | "beginner" | "technical" | "practical" | "alternative";
  snippet: string;
  moment: SearchLandingMoment;
  confidence: number;
};

export type AnswerDominanceResult = ExtractedAnswerResult & {
  directAnswer: string | null;
  supportingEvidence: SearchLandingMoment[];
  alternativeExplanations: TieredExplanation[];
  bestBeginnerExplanation: TieredExplanation | null;
  bestTechnicalExplanation: TieredExplanation | null;
  bestPracticalExample: TieredExplanation | null;
};

const BEGINNER_MARKERS = /\b(basically|simply|in other words|introduction|beginner|overview|what is|means)\b/i;
const TECHNICAL_MARKERS = /\b(algorithm|architecture|implementation|protocol|api|model|training|inference|stack|framework)\b/i;
const PRACTICAL_MARKERS = /\b(example|for instance|step|workflow|how to|you can|let's say|demo|build)\b/i;

function scoreTier(snippet: string, tier: TieredExplanation["tier"]) {
  const lower = snippet.toLowerCase();
  if (tier === "beginner") return BEGINNER_MARKERS.test(lower) ? 0.8 : 0.35;
  if (tier === "technical") return TECHNICAL_MARKERS.test(lower) ? 0.85 : 0.3;
  if (tier === "practical") return PRACTICAL_MARKERS.test(lower) ? 0.82 : 0.32;
  return 0.4;
}

function sentenceCandidates(snippet: string) {
  return normalizeText(snippet)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
}

function buildTieredExplanation(
  moment: SearchLandingMoment,
  tier: TieredExplanation["tier"]
): TieredExplanation | null {
  const sentences = sentenceCandidates(moment.snippet);
  if (sentences.length === 0) return null;

  let best = sentences[0];
  let bestScore = -1;
  for (const sentence of sentences) {
    const score = scoreTier(sentence, tier);
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  return {
    label:
      tier === "beginner"
        ? "Best beginner explanation"
        : tier === "technical"
          ? "Best technical explanation"
          : tier === "practical"
            ? "Best practical example"
            : "Alternative explanation",
    tier,
    snippet: best,
    moment,
    confidence: Number(bestScore.toFixed(2)),
  };
}

export function buildAnswerDominance(input: {
  query: string;
  moments: SearchLandingMoment[];
  relatedPhrases?: string[];
  peopleAlsoSearched?: Array<{ phrase: string; href: string }>;
}): AnswerDominanceResult {
  const base = extractAnswerFromMoments(input);
  const usedVideoIds = new Set<string>();

  const tierCandidates = input.moments
    .map((moment) => ({
      beginner: buildTieredExplanation(moment, "beginner"),
      technical: buildTieredExplanation(moment, "technical"),
      practical: buildTieredExplanation(moment, "practical"),
    }))
    .flatMap((entry) => [entry.beginner, entry.technical, entry.practical].filter(Boolean) as TieredExplanation[])
    .sort((left, right) => right.confidence - left.confidence);

  const bestBeginnerExplanation = tierCandidates.find((item) => item.tier === "beginner") ?? null;
  const bestTechnicalExplanation = tierCandidates.find((item) => item.tier === "technical") ?? null;
  const bestPracticalExample = tierCandidates.find((item) => item.tier === "practical") ?? null;

  const alternativeExplanations = input.moments
    .slice(0, 8)
    .map((moment) => buildTieredExplanation(moment, "alternative"))
    .filter((item): item is TieredExplanation => Boolean(item))
    .filter((item) => item.moment.videoId !== base.sourceMoment?.videoId)
    .slice(0, 4);

  for (const moment of input.moments.slice(0, 6)) {
    usedVideoIds.add(moment.videoId);
  }

  return {
    ...base,
    directAnswer: base.answerSnippet,
    supportingEvidence: base.supportingMoments,
    alternativeExplanations,
    bestBeginnerExplanation,
    bestTechnicalExplanation,
    bestPracticalExample,
  };
}
