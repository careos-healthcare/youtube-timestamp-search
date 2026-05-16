import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { RetrievalQualityDimensionId } from "./retrieval-quality";

/** Weights for composite retrieval `overallNormalized` (must sum to ~1). */
export type RetrievalDimensionWeights = Partial<Record<RetrievalQualityDimensionId, number>>;

export type IngestionPriorityWeights = {
  sourceQuality: number;
  retrievalOverall: number;
  topicCoverageGain: number;
  semanticYieldEstimate: number;
  citationPotential: number;
  corpusDiversityBonus: number;
  creatorDuplicationPenalty: number;
  transcriptLengthBand: number;
  explanationDensityBoost: number;
  technicalDensityBoost: number;
  clipExtractionBoost: number;
  semanticMomentYieldBoost: number;
  researchWorkflowBoost: number;
  shallowAuthorityPenalty: number;
  perRejectHeuristicPenalty: number;
  maxRejectPenalty: number;
};

export type RetrievalPriorityWeightsFile = {
  version: 1;
  generatedAt?: string;
  notes?: string;
  retrievalDimensionWeights: RetrievalDimensionWeights;
  ingestionPriority: IngestionPriorityWeights;
  profiles?: {
    preCalibration?: {
      retrievalDimensionWeights: RetrievalDimensionWeights;
      ingestionPriority: IngestionPriorityWeights;
    };
    tunedV1?: {
      retrievalDimensionWeights: RetrievalDimensionWeights;
      ingestionPriority: IngestionPriorityWeights;
    };
  };
};

export const DEFAULT_RETRIEVAL_DIMENSION_WEIGHTS: RetrievalDimensionWeights = {
  explanation_density: 0.12,
  multi_speaker_penalty: 0.06,
  filler_ratio: 0.08,
  repeated_phrase_ratio: 0.06,
  citation_richness: 0.1,
  technical_terminology_density: 0.1,
  actionable_tutorial_density: 0.07,
  concrete_example_density: 0.06,
  question_answer_density: 0.06,
  speculation_opinion_ratio: 0.06,
  transcript_coherence: 0.07,
  clip_extraction_quality: 0.08,
  semantic_moment_yield: 0.08,
  average_accepted_moment_score: 0.07,
};

/** Snapshot of weights before governance tuning pass (matches first shipped priority model). */
export const PRE_CALIBRATION_INGESTION_PRIORITY: IngestionPriorityWeights = {
  sourceQuality: 0.22,
  retrievalOverall: 0.28,
  topicCoverageGain: 0.12,
  semanticYieldEstimate: 0.1,
  citationPotential: 0.1,
  corpusDiversityBonus: 0.1,
  creatorDuplicationPenalty: 0.08,
  transcriptLengthBand: 0.06,
  explanationDensityBoost: 0,
  technicalDensityBoost: 0,
  clipExtractionBoost: 0,
  semanticMomentYieldBoost: 0,
  researchWorkflowBoost: 0,
  shallowAuthorityPenalty: 0,
  perRejectHeuristicPenalty: 0,
  maxRejectPenalty: 0,
};

/** First governance pass (caught: did not improve top-batch cite/h). */
export const TUNED_V1_INGESTION_PRIORITY: IngestionPriorityWeights = {
  sourceQuality: 0.12,
  retrievalOverall: 0.2,
  topicCoverageGain: 0.1,
  semanticYieldEstimate: 0.05,
  citationPotential: 0.16,
  corpusDiversityBonus: 0.1,
  creatorDuplicationPenalty: 0.09,
  transcriptLengthBand: 0.05,
  explanationDensityBoost: 0.09,
  technicalDensityBoost: 0.07,
  clipExtractionBoost: 0.08,
  semanticMomentYieldBoost: 0,
  researchWorkflowBoost: 0.06,
  shallowAuthorityPenalty: 9,
  perRejectHeuristicPenalty: 3.5,
  maxRejectPenalty: 14,
};

/**
 * Iteration 2: emphasize semantic yield + clip quality; de-emphasize source priors
 * and transcript “academic” language; softer penalties on dense technical/tutorial content.
 */
export const TUNED_INGESTION_PRIORITY: IngestionPriorityWeights = {
  sourceQuality: 0.06,
  retrievalOverall: 0.11,
  topicCoverageGain: 0.08,
  semanticYieldEstimate: 0.14,
  citationPotential: 0.05,
  corpusDiversityBonus: 0.1,
  creatorDuplicationPenalty: 0.08,
  transcriptLengthBand: 0.04,
  explanationDensityBoost: 0.08,
  technicalDensityBoost: 0.11,
  clipExtractionBoost: 0.16,
  semanticMomentYieldBoost: 0.14,
  researchWorkflowBoost: 0.08,
  shallowAuthorityPenalty: 5,
  perRejectHeuristicPenalty: 2,
  maxRejectPenalty: 10,
};

/** Empirical retrieval composite — cite/h predictors weighted highest. */
export const DEFAULT_TUNED_RETRIEVAL_DIMENSION_WEIGHTS: RetrievalDimensionWeights = {
  semantic_moment_yield: 0.2,
  clip_extraction_quality: 0.18,
  average_accepted_moment_score: 0.12,
  explanation_density: 0.1,
  technical_terminology_density: 0.1,
  actionable_tutorial_density: 0.09,
  transcript_coherence: 0.06,
  multi_speaker_penalty: 0.04,
  filler_ratio: 0.04,
  repeated_phrase_ratio: 0.04,
  citation_richness: 0.04,
  concrete_example_density: 0.04,
  question_answer_density: 0.03,
  speculation_opinion_ratio: 0.03,
};

export function normalizeDimensionWeights(
  weights: RetrievalDimensionWeights
): RetrievalDimensionWeights {
  const ids = Object.keys(weights) as RetrievalQualityDimensionId[];
  let sum = 0;
  for (const id of ids) {
    sum += weights[id] ?? 0;
  }
  if (sum <= 0) return { ...DEFAULT_RETRIEVAL_DIMENSION_WEIGHTS };
  const out: RetrievalDimensionWeights = {};
  for (const id of ids) {
    out[id] = (weights[id] ?? 0) / sum;
  }
  return out;
}

export function loadRetrievalPriorityWeights(
  path = join(process.cwd(), "data", "retrieval-priority-weights.json")
): RetrievalPriorityWeightsFile {
  if (!existsSync(path)) {
    return {
      version: 1,
      retrievalDimensionWeights: { ...DEFAULT_TUNED_RETRIEVAL_DIMENSION_WEIGHTS },
      ingestionPriority: { ...TUNED_INGESTION_PRIORITY },
      profiles: {
        preCalibration: {
          retrievalDimensionWeights: { ...DEFAULT_RETRIEVAL_DIMENSION_WEIGHTS },
          ingestionPriority: { ...PRE_CALIBRATION_INGESTION_PRIORITY },
        },
      },
    };
  }
  return JSON.parse(readFileSync(path, "utf-8")) as RetrievalPriorityWeightsFile;
}
