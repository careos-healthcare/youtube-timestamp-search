import type { IngestionSourceScoreResult } from "./source-types";
import type { RetrievalQualityDimensionId, RetrievalQualityResult } from "./retrieval-quality";

export type IngestionPriorityBreakdownLine = {
  factor: string;
  /** Signed contribution toward priorityScore before clamping. */
  contribution: number;
  detail: string;
};

export type IngestionPriorityScoreResult = {
  /** 0–100 higher = ingest sooner. */
  priorityScore: number;
  /** 0–1 */
  normalized: number;
  breakdown: IngestionPriorityBreakdownLine[];
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function dimNorm(result: RetrievalQualityResult, id: RetrievalQualityDimensionId): number {
  return result.dimensions.find((d) => d.id === id)?.normalized ?? 0;
}

/**
 * Transcript-only semantic yield ceiling before materialization (0–1).
 */
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

/**
 * Combines allowlist/source score, retrieval-quality transcript model, topic intent,
 * diversity, and duplication penalties into a single explainable ingest priority.
 */
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
}): IngestionPriorityScoreResult {
  const topicGain =
    params.topicCoverageGainScore ?? scoreTopicCoverageGainText(params.topicCoverageGainText);
  const citePot =
    params.citationPotential ?? dimNorm(params.retrievalQuality, "citation_richness");
  const breakdown: IngestionPriorityBreakdownLine[] = [];

  const wSource = 0.22;
  const wRetrieval = 0.28;
  const wTopic = 0.12;
  const wSem = 0.1;
  const wCite = 0.1;
  const wDiv = 0.1;
  const wDup = 0.08;

  const sourceN = clamp01(params.sourceQuality.score / 100);
  breakdown.push({
    factor: "source_quality_0_1",
    contribution: sourceN * wSource * 100,
    detail: `ingest score=${params.sourceQuality.score} tier=${params.sourceQuality.tier}`,
  });

  breakdown.push({
    factor: "retrieval_quality_overall",
    contribution: params.retrievalQuality.overallNormalized * wRetrieval * 100,
    detail: `retrieval_norm=${params.retrievalQuality.overallNormalized.toFixed(3)} tier=${params.retrievalQuality.tier}`,
  });

  breakdown.push({
    factor: "topic_coverage_gain",
    contribution: topicGain * wTopic * 100,
    detail: `topic_gain_norm=${topicGain.toFixed(3)}`,
  });

  breakdown.push({
    factor: "semantic_yield_estimate",
    contribution: clamp01(params.semanticYieldEstimate) * wSem * 100,
    detail: `semantic_yield_est=${params.semanticYieldEstimate.toFixed(3)}`,
  });

  breakdown.push({
    factor: "citation_potential",
    contribution: clamp01(citePot) * wCite * 100,
    detail: `citation_potential=${citePot.toFixed(3)}`,
  });

  const div = clamp01(params.corpusDiversityBonus);
  breakdown.push({
    factor: "corpus_diversity_bonus",
    contribution: div * wDiv * 100,
    detail: `diversity_bonus=${div.toFixed(3)}`,
  });

  const dup = clamp01(params.creatorDuplicationPenalty);
  const dupPenalty = dup * wDup * 100;
  breakdown.push({
    factor: "creator_duplication_penalty",
    contribution: -dupPenalty,
    detail: `dup_penalty_norm=${dup.toFixed(3)}`,
  });

  const lenBand = clamp01(params.transcriptLengthQualityBand);
  breakdown.push({
    factor: "transcript_length_band",
    contribution: lenBand * 0.06 * 100,
    detail: `length_band=${lenBand.toFixed(3)} segs=${params.segmentCount}`,
  });

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
