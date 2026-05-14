import type { ExtractedAnswerResult } from "@/lib/search/answer-extraction";

export type AnswerQualitySignals = {
  clickthroughRate: number;
  dwellScore: number;
  successfulExitRate: number;
  reformulationPenalty: number;
  bounceBackPenalty: number;
  extractionConfidence: number;
};

export type RankedAnswerCandidate = {
  answer: ExtractedAnswerResult;
  qualityScore: number;
  signals: AnswerQualitySignals;
};

export function rankAnswerQuality(input: {
  answer: ExtractedAnswerResult;
  analytics?: Partial<AnswerQualitySignals>;
}): RankedAnswerCandidate {
  const analytics = input.analytics ?? {};
  const clickthroughRate = analytics.clickthroughRate ?? 0;
  const dwellScore = analytics.dwellScore ?? 0;
  const successfulExitRate = analytics.successfulExitRate ?? 0;
  const reformulationPenalty = analytics.reformulationPenalty ?? 0;
  const bounceBackPenalty = analytics.bounceBackPenalty ?? 0;
  const extractionConfidence = input.answer.confidence;

  const qualityScore = Math.max(
    0,
    Number(
      (
        extractionConfidence * 35 +
        clickthroughRate * 20 +
        dwellScore * 15 +
        successfulExitRate * 15 -
        reformulationPenalty * 12 -
        bounceBackPenalty * 15 +
        (input.answer.mode === "answer" ? 10 : 0)
      ).toFixed(2)
    )
  );

  return {
    answer: input.answer,
    qualityScore,
    signals: {
      clickthroughRate,
      dwellScore,
      successfulExitRate,
      reformulationPenalty,
      bounceBackPenalty,
      extractionConfidence,
    },
  };
}

export function compareAnswerCandidates(left: RankedAnswerCandidate, right: RankedAnswerCandidate) {
  return right.qualityScore - left.qualityScore;
}
