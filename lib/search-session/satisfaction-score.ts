import type { SessionIntelligenceSignals } from "@/lib/search-session/session-intelligence";

export type SearchSatisfactionBreakdown = {
  clickSuccess: number;
  lowReformulation: number;
  lowPogoStick: number;
  lowAbandonment: number;
  answerSuccessRate: number;
  penalties: {
    reformulationPenalty: number;
    pogoPenalty: number;
    abandonmentPenalty: number;
  };
};

export type SearchSatisfactionScore = {
  score: number;
  label: "excellent" | "good" | "mixed" | "poor";
  breakdown: SearchSatisfactionBreakdown;
};

export function computeSearchSatisfactionScore(signals: SessionIntelligenceSignals): SearchSatisfactionScore {
  if (signals.totalSessions === 0) {
    return {
      score: 0,
      label: "poor",
      breakdown: {
        clickSuccess: 0,
        lowReformulation: 0,
        lowPogoStick: 0,
        lowAbandonment: 0,
        answerSuccessRate: 0,
        penalties: { reformulationPenalty: 0, pogoPenalty: 0, abandonmentPenalty: 0 },
      },
    };
  }

  const answerSuccessRate = signals.successfulAnswerSessions / signals.totalSessions;
  const reformulationRate = signals.reformulationCount / signals.totalSessions;
  const pogoRate = signals.pogoStickCount / signals.totalSessions;
  const abandonmentRate = signals.abandonmentCount / signals.totalSessions;

  const clickSuccess = Math.min(answerSuccessRate, 1) * 40;
  const lowReformulation = Math.max(0, 1 - Math.min(reformulationRate / 2, 1)) * 20;
  const lowPogoStick = Math.max(0, 1 - Math.min(pogoRate / 1.5, 1)) * 20;
  const lowAbandonment = Math.max(0, 1 - Math.min(abandonmentRate / 1.2, 1)) * 20;

  const reformulationPenalty = Math.min(reformulationRate * 8, 20);
  const pogoPenalty = Math.min(pogoRate * 10, 25);
  const abandonmentPenalty = Math.min(abandonmentRate * 12, 25);

  const score = Math.max(
    0,
    Number(
      (
        clickSuccess +
        lowReformulation +
        lowPogoStick +
        lowAbandonment +
        answerSuccessRate * 20 -
        reformulationPenalty -
        pogoPenalty -
        abandonmentPenalty
      ).toFixed(1)
    )
  );

  const label =
    score >= 75 ? "excellent" : score >= 55 ? "good" : score >= 35 ? "mixed" : "poor";

  return {
    score,
    label,
    breakdown: {
      clickSuccess,
      lowReformulation,
      lowPogoStick,
      lowAbandonment,
      answerSuccessRate: Number(answerSuccessRate.toFixed(3)),
      penalties: {
        reformulationPenalty,
        pogoPenalty,
        abandonmentPenalty,
      },
    },
  };
}
