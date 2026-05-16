import type { IngestionSourceScoreResult } from "./source-types";
import type { RetrievalQualityDimensionId, RetrievalQualityResult } from "./retrieval-quality";
import { TUNED_INGESTION_PRIORITY, type IngestionPriorityWeights } from "./retrieval-priority-weights";

export type { IngestionPriorityWeights } from "./retrieval-priority-weights";
export {
  PRE_CALIBRATION_INGESTION_PRIORITY,
  TUNED_INGESTION_PRIORITY,
  TUNED_V1_INGESTION_PRIORITY,
} from "./retrieval-priority-weights";

export type IngestionPriorityBreakdownLine = {
  factor: string;
  contribution: number;
  detail: string;
};

export type IngestionPriorityScoreResult = {
  priorityScore: number;
  normalized: number;
  breakdown: IngestionPriorityBreakdownLine[];
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function dimNorm(result: RetrievalQualityResult, id: RetrievalQualityDimensionId): number {
  return result.dimensions.find((d) => d.id === id)?.normalized ?? 0;
}

export function estimateSemanticYieldFromTranscriptShape(segmentCount: number, durationMinutes?: number): number {
  const hours = Math.max(0.25, (durationMinutes ?? 50) / 60);
  const density = segmentCount / hours;
  return clamp01(Math.log1p(density) / Math.log1p(950));
}

export function scoreTopicCoverageGainText(text: string | undefined): number {
  if (!text?.trim()) return 0.35;
  const t = text.toLowerCase();
  let s = 0.35 + Math.min(0.35, text.length / 900);
  if (/\b(diversity|counterpoint|second voice|depth|comparison|authority)\b/i.test(t)) s += 0.12;
  if (/\b(transformer|kubernetes|docker|ml|policy|safety|rag)\b/i.test(t)) s += 0.08;
  return clamp01(s);
}

export function transcriptLengthQualityBand(segmentCount: number, durationMinutes?: number): number {
  if (segmentCount >= 500) return 1;
  if (segmentCount >= 350) return 0.95;
  if (segmentCount >= 200) return 0.82;
  if (segmentCount >= 80) return 0.65;
  if (segmentCount >= 40) return 0.48;
  const dm = durationMinutes ?? 0;
  if (dm >= 45 && segmentCount > 0) return 0.42;
  return 0.28;
}

function researchWorkflowComposite(rq: RetrievalQualityResult): number {
  return clamp01(
    dimNorm(rq, "explanation_density") * 0.35 +
      dimNorm(rq, "technical_terminology_density") * 0.3 +
      dimNorm(rq, "question_answer_density") * 0.2 +
      dimNorm(rq, "concrete_example_density") * 0.15
  );
}

function governancePenalties(rq: RetrievalQualityResult, w: IngestionPriorityWeights): number {
  let penalty = 0;
  const matched = rq.rejectHeuristics.filter((h) => h.matched).length;
  if (matched > 0 && w.perRejectHeuristicPenalty > 0) {
    penalty += Math.min(w.maxRejectPenalty, matched * w.perRejectHeuristicPenalty);
  }
  if (rq.flags.poorCitationValue && w.shallowAuthorityPenalty > 0) {
    penalty += w.shallowAuthorityPenalty * 0.55;
  }
  const tutorialDense = dimNorm(rq, "actionable_tutorial_density") >= 0.45;
  if (rq.flags.weakEducationalDensity && w.shallowAuthorityPenalty > 0 && !tutorialDense) {
    penalty += w.shallowAuthorityPenalty * 0.45;
  }
  if (rq.flags.lowRetrievalValue && w.shallowAuthorityPenalty > 0) {
    penalty += w.shallowAuthorityPenalty * 0.35;
  }
  return penalty;
}

export function buildIngestionPriorityScore(params: {
  sourceQuality: IngestionSourceScoreResult;
  retrievalQuality: RetrievalQualityResult;
  topicCoverageGainText?: string;
  topicCoverageGainScore?: number;
  semanticYieldEstimate: number;
  citationPotential?: number;
  corpusDiversityBonus: number;
  creatorDuplicationPenalty: number;
  transcriptLengthQualityBand: number;
  segmentCount: number;
  weights?: IngestionPriorityWeights;
}): IngestionPriorityScoreResult {
  const w = params.weights ?? TUNED_INGESTION_PRIORITY;
  const rq = params.retrievalQuality;
  const topicGain =
    params.topicCoverageGainScore ?? scoreTopicCoverageGainText(params.topicCoverageGainText);
  const citePot = params.citationPotential ?? dimNorm(rq, "citation_richness");
  const breakdown: IngestionPriorityBreakdownLine[] = [];

  const sourceN = clamp01(params.sourceQuality.score / 100);
  breakdown.push({
    factor: "source_quality_0_1",
    contribution: sourceN * w.sourceQuality * 100,
    detail: `ingest score=${params.sourceQuality.score} tier=${params.sourceQuality.tier}`,
  });

  breakdown.push({
    factor: "retrieval_quality_overall",
    contribution: rq.overallNormalized * w.retrievalOverall * 100,
    detail: `retrieval_norm=${rq.overallNormalized.toFixed(3)} tier=${rq.tier}`,
  });

  breakdown.push({
    factor: "topic_coverage_gain",
    contribution: topicGain * w.topicCoverageGain * 100,
    detail: `topic_gain_norm=${topicGain.toFixed(3)}`,
  });

  breakdown.push({
    factor: "semantic_yield_estimate",
    contribution: clamp01(params.semanticYieldEstimate) * w.semanticYieldEstimate * 100,
    detail: `semantic_yield_est=${params.semanticYieldEstimate.toFixed(3)}`,
  });

  breakdown.push({
    factor: "citation_potential",
    contribution: clamp01(citePot) * w.citationPotential * 100,
    detail: `citation_potential=${citePot.toFixed(3)}`,
  });

  const div = clamp01(params.corpusDiversityBonus);
  breakdown.push({
    factor: "corpus_diversity_bonus",
    contribution: div * w.corpusDiversityBonus * 100,
    detail: `diversity_bonus=${div.toFixed(3)}`,
  });

  const dup = clamp01(params.creatorDuplicationPenalty);
  breakdown.push({
    factor: "creator_duplication_penalty",
    contribution: -dup * w.creatorDuplicationPenalty * 100,
    detail: `dup_penalty_norm=${dup.toFixed(3)}`,
  });

  const lenBand = clamp01(params.transcriptLengthQualityBand);
  breakdown.push({
    factor: "transcript_length_band",
    contribution: lenBand * w.transcriptLengthBand * 100,
    detail: `length_band=${lenBand.toFixed(3)} segs=${params.segmentCount}`,
  });

  if (w.explanationDensityBoost > 0) {
    const v = dimNorm(rq, "explanation_density");
    breakdown.push({
      factor: "explanation_density_boost",
      contribution: v * w.explanationDensityBoost * 100,
      detail: `explanation_dim=${v.toFixed(3)}`,
    });
  }
  if (w.technicalDensityBoost > 0) {
    const v = dimNorm(rq, "technical_terminology_density");
    breakdown.push({
      factor: "technical_density_boost",
      contribution: v * w.technicalDensityBoost * 100,
      detail: `technical_dim=${v.toFixed(3)}`,
    });
  }
  if (w.clipExtractionBoost > 0) {
    const v = dimNorm(rq, "clip_extraction_quality");
    breakdown.push({
      factor: "clip_extraction_boost",
      contribution: v * w.clipExtractionBoost * 100,
      detail: `clip_dim=${v.toFixed(3)}`,
    });
  }
  if (w.semanticMomentYieldBoost > 0) {
    const v = dimNorm(rq, "semantic_moment_yield");
    breakdown.push({
      factor: "semantic_moment_yield_boost",
      contribution: v * w.semanticMomentYieldBoost * 100,
      detail: `semantic_yield_dim=${v.toFixed(3)}`,
    });
  }
  if (w.researchWorkflowBoost > 0) {
    const v = researchWorkflowComposite(rq);
    breakdown.push({
      factor: "research_workflow_boost",
      contribution: v * w.researchWorkflowBoost * 100,
      detail: `research_workflow=${v.toFixed(3)}`,
    });
  }

  const govPen = governancePenalties(rq, w);
  if (govPen > 0) {
    breakdown.push({
      factor: "governance_penalties",
      contribution: -govPen,
      detail: `reject_matches=${rq.rejectHeuristics.filter((h) => h.matched).length} flags=${rq.flags.reasons.join("; ") || "none"}`,
    });
  }

  let raw = 0;
  for (const b of breakdown) {
    raw += b.contribution;
  }

  const priorityScore = Math.round(Math.max(0, Math.min(100, raw)));
  return {
    priorityScore,
    normalized: priorityScore / 100,
    breakdown,
  };
}
