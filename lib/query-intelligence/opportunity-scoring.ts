import type { QueryIntent } from "@/lib/query-intelligence/intent-classifier";
import { commercialIntentScore } from "@/lib/query-intelligence/intent-classifier";

export type OpportunityInput = {
  phrase: string;
  demand: number;
  zeroResults: number;
  clicks: number;
  feedbackYes: number;
  feedbackNo: number;
  existingCoverage: number;
  topicDepthGap: number;
  freshnessBoost: number;
  intent: QueryIntent;
};

export type ScoredOpportunity = OpportunityInput & {
  commercialIntent: number;
  opportunityScore: number;
  components: {
    demand: number;
    zeroResultWeight: number;
    topicDepthGap: number;
    commercialIntent: number;
    freshnessBoost: number;
    existingCoveragePenalty: number;
    badResultPenalty: number;
  };
};

export function scoreOpportunity(input: OpportunityInput): ScoredOpportunity {
  const demand = Math.log2(input.demand + 1) * 12;
  const zeroResultWeight = input.zeroResults > 0 ? Math.min(input.zeroResults * 8, 40) : 0;
  const topicDepthGap = input.topicDepthGap * 18;
  const commercialIntent = commercialIntentScore(input.phrase) * 20;
  const freshnessBoost = input.freshnessBoost * 10;
  const existingCoveragePenalty = input.existingCoverage * 25;
  const badResultPenalty =
    input.feedbackNo > input.feedbackYes ? Math.min((input.feedbackNo - input.feedbackYes) * 6, 24) : 0;

  const opportunityScore = Math.max(
    0,
    Number(
      (
        demand +
        zeroResultWeight +
        topicDepthGap +
        commercialIntent +
        freshnessBoost -
        existingCoveragePenalty -
        badResultPenalty
      ).toFixed(2)
    )
  );

  return {
    ...input,
    commercialIntent: commercialIntentScore(input.phrase),
    opportunityScore,
    components: {
      demand,
      zeroResultWeight,
      topicDepthGap,
      commercialIntent,
      freshnessBoost,
      existingCoveragePenalty,
      badResultPenalty,
    },
  };
}

export function rankOpportunities(inputs: OpportunityInput[]) {
  return inputs
    .map((input) => scoreOpportunity(input))
    .sort((left, right) => right.opportunityScore - left.opportunityScore);
}
