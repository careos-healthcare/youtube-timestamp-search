#!/usr/bin/env tsx
/**
 * Governance pass: validate priority weights, simulate Wave 1 batches (no ingest).
 *
 *   npm run report:retrieval-weight-tuning
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildIngestionPriorityScore,
  estimateSemanticYieldFromTranscriptShape,
  transcriptLengthQualityBand,
} from "@/lib/corpus/ingestion-priority";
import {
  deriveDimensionWeightsFromPredictiveness,
  analyzeChannelResearchDensity,
  analyzeConversationalDriftHeuristic,
  analyzeDimensionPredictiveness,
  analyzeExpertVsConversational,
  compareWave1BatchTrust,
  formatValidationMarkdown,
  type VideoEvalSlice,
  type Wave1SimulationComparison,
} from "@/lib/corpus/retrieval-weight-validation";
import {
  DEFAULT_RETRIEVAL_DIMENSION_WEIGHTS,
  DEFAULT_TUNED_RETRIEVAL_DIMENSION_WEIGHTS,
  normalizeDimensionWeights,
  PRE_CALIBRATION_INGESTION_PRIORITY,
  TUNED_INGESTION_PRIORITY,
  TUNED_V1_INGESTION_PRIORITY,
  type RetrievalPriorityWeightsFile,
} from "@/lib/corpus/retrieval-priority-weights";
import { loadWave1PlanFile } from "@/lib/ingestion-wave-1-validate";

type EvalFile = {
  generatedAt: string;
  videos: VideoEvalSlice[];
};

function loadEvaluation(path: string): EvalFile {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run: npm run report:retrieval-quality`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as EvalFile;
}

function priorityForCandidate(
  c: {
    videoId: string;
    channelName: string;
    expectedTopicCoverageGain?: string;
    durationMinutesEstimate?: number;
    sourceQuality: Parameters<typeof buildIngestionPriorityScore>[0]["sourceQuality"];
  },
  slice: VideoEvalSlice,
  momentCountByChannel: Map<string, number>,
  weights: Parameters<typeof buildIngestionPriorityScore>[0]["weights"]
) {
  const semEst = estimateSemanticYieldFromTranscriptShape(
    slice.segmentCount || Math.max(24, Math.floor((c.durationMinutesEstimate ?? 55) * 2.8)),
    c.durationMinutesEstimate
  );
  const lenBand = transcriptLengthQualityBand(slice.segmentCount || 0, c.durationMinutesEstimate);
  const ch = c.channelName.trim() || "unknown_channel";
  const dup = Math.min(1, (momentCountByChannel.get(ch) ?? 0) / 42);
  const diversity = 1 - dup * 0.85;
  return buildIngestionPriorityScore({
    sourceQuality: c.sourceQuality,
    retrievalQuality: slice.retrieval,
    topicCoverageGainText: c.expectedTopicCoverageGain,
    semanticYieldEstimate: semEst,
    corpusDiversityBonus: diversity,
    creatorDuplicationPenalty: dup,
    transcriptLengthQualityBand: lenBand,
    segmentCount: slice.segmentCount,
    weights,
  }).priorityScore;
}

function buildSimulationComparison(params: {
  batchSize: number;
  wave1VideoIds: string[];
  videoById: Map<string, VideoEvalSlice>;
  preScores: Map<string, number>;
  v1Scores: Map<string, number>;
  v2Scores: Map<string, number>;
}): Wave1SimulationComparison {
  const { batchSize, wave1VideoIds, videoById, preScores, v1Scores, v2Scores } = params;
  const candidates = wave1VideoIds.map((videoId) => ({ videoId, priorityScore: 0 }));

  const pre = compareWave1BatchTrust({
    candidates,
    videoById,
    batchSize,
    preScores,
    tunedScores: preScores,
  });
  const v1 = compareWave1BatchTrust({
    candidates,
    videoById,
    batchSize,
    preScores,
    tunedScores: v1Scores,
  });
  const v2 = compareWave1BatchTrust({
    candidates,
    videoById,
    batchSize,
    preScores,
    tunedScores: v2Scores,
  });

  const deltaV1VsPre =
    pre.preCalibration.expectedCitationsPerHour != null &&
    v1.tuned.expectedCitationsPerHour != null
      ? v1.tuned.expectedCitationsPerHour - pre.preCalibration.expectedCitationsPerHour
      : null;
  const deltaV2VsPre =
    pre.preCalibration.expectedCitationsPerHour != null &&
    v2.tuned.expectedCitationsPerHour != null
      ? v2.tuned.expectedCitationsPerHour - pre.preCalibration.expectedCitationsPerHour
      : null;
  const deltaV2VsV1 =
    v1.tuned.expectedCitationsPerHour != null && v2.tuned.expectedCitationsPerHour != null
      ? v2.tuned.expectedCitationsPerHour - v1.tuned.expectedCitationsPerHour
      : null;

  const trustGate = (delta: number | null) => delta != null && delta > 0.02;

  return {
    batchSize,
    preCalibration: { ...pre.preCalibration, label: "pre_calibration" },
    tunedV1: { ...v1.tuned, label: "tuned_v1" },
    tunedV2: { ...v2.tuned, label: "tuned_v2" },
    deltaV1VsPreCitationsPerHour: deltaV1VsPre,
    deltaV2VsPreCitationsPerHour: deltaV2VsPre,
    deltaV2VsV1CitationsPerHour: deltaV2VsV1,
    retrievalTrustImprovedV1: trustGate(deltaV1VsPre),
    retrievalTrustImprovedV2: trustGate(deltaV2VsPre),
    readyForControlledIngest: trustGate(deltaV2VsPre),
  };
}

async function main() {
  const evalPath = join(process.cwd(), "data", "retrieval-quality-evaluation.json");
  const eval_ = loadEvaluation(evalPath);
  const predictiveness = analyzeDimensionPredictiveness(eval_.videos);
  const derivedDims = normalizeDimensionWeights(
    deriveDimensionWeightsFromPredictiveness(predictiveness)
  );
  const drift = analyzeConversationalDriftHeuristic(eval_.videos);
  const channels = analyzeChannelResearchDensity(eval_.videos);
  const expertVsConversational = analyzeExpertVsConversational(channels.all);

  const videoById = new Map(eval_.videos.map((v) => [v.videoId, v]));
  const wave1Doc = loadWave1PlanFile();
  const batchSize = 5;

  const momentCountByChannel = new Map<string, number>();
  for (const v of eval_.videos) {
    const k = v.channelName.trim() || "unknown_channel";
    momentCountByChannel.set(k, (momentCountByChannel.get(k) ?? 0) + v.momentCount);
  }

  const preScores = new Map<string, number>();
  const v1Scores = new Map<string, number>();
  const v2Scores = new Map<string, number>();

  const wave1Ids: string[] = [];
  for (const c of wave1Doc.candidates ?? []) {
    const slice = videoById.get(c.videoId);
    if (!slice) continue;
    wave1Ids.push(c.videoId);
    preScores.set(
      c.videoId,
      priorityForCandidate(c, slice, momentCountByChannel, PRE_CALIBRATION_INGESTION_PRIORITY)
    );
    v1Scores.set(
      c.videoId,
      priorityForCandidate(c, slice, momentCountByChannel, TUNED_V1_INGESTION_PRIORITY)
    );
    v2Scores.set(
      c.videoId,
      priorityForCandidate(c, slice, momentCountByChannel, TUNED_INGESTION_PRIORITY)
    );
  }

  const wave1Simulation = buildSimulationComparison({
    batchSize,
    wave1VideoIds: wave1Ids,
    videoById,
    preScores,
    v1Scores,
    v2Scores,
  });

  const generatedAt = new Date().toISOString();
  const weightsFile: RetrievalPriorityWeightsFile = {
    version: 1,
    generatedAt,
    notes:
      "v2 emphasizes semantic moment yield + clip extraction (empirical cite/h predictors). Do not ingest until capped simulation shows positive Δ cite/h vs pre-calibration.",
    retrievalDimensionWeights: derivedDims,
    ingestionPriority: { ...TUNED_INGESTION_PRIORITY },
    profiles: {
      preCalibration: {
        retrievalDimensionWeights: { ...DEFAULT_RETRIEVAL_DIMENSION_WEIGHTS },
        ingestionPriority: { ...PRE_CALIBRATION_INGESTION_PRIORITY },
      },
      tunedV1: {
        retrievalDimensionWeights: { ...DEFAULT_TUNED_RETRIEVAL_DIMENSION_WEIGHTS },
        ingestionPriority: { ...TUNED_V1_INGESTION_PRIORITY },
      },
    },
  };

  const validationJson = {
    generatedAt,
    predictiveness,
    drift,
    channels,
    expertVsConversational,
    wave1Simulation,
    weightsFile,
  };

  const weightsPath = join(process.cwd(), "data", "retrieval-priority-weights.json");
  const validationPath = join(process.cwd(), "data", "retrieval-weight-validation.json");
  const reportPath = join(process.cwd(), "RETRIEVAL_WEIGHT_TUNING_REPORT.md");
  const rankedPath = join(process.cwd(), "data", "ingestion-wave-1-ranked.json");

  writeFileSync(weightsPath, JSON.stringify(weightsFile, null, 2), "utf-8");
  writeFileSync(validationPath, JSON.stringify(validationJson, null, 2), "utf-8");
  writeFileSync(
    reportPath,
    formatValidationMarkdown({
      generatedAt,
      predictiveness,
      drift,
      channels,
      expertVsConversational,
      wave1Simulation,
      tunedWeightsProfile: TUNED_INGESTION_PRIORITY,
    }),
    "utf-8"
  );

  const ranked = [...(wave1Doc.candidates ?? [])]
    .filter((c) => v2Scores.has(c.videoId))
    .map((c) => ({
      id: c.id,
      videoId: c.videoId,
      channelName: c.channelName,
      videoTitle: c.videoTitle,
      priorityScorePre: preScores.get(c.videoId) ?? 0,
      priorityScoreTunedV1: v1Scores.get(c.videoId) ?? 0,
      priorityScoreTunedV2: v2Scores.get(c.videoId) ?? 0,
      citationsPerHour: videoById.get(c.videoId)?.research.citationsPerTranscriptHour ?? null,
      retrievalOverall: videoById.get(c.videoId)?.retrieval.overallNormalized ?? null,
    }))
    .sort((a, b) => b.priorityScoreTunedV2 - a.priorityScoreTunedV2);

  writeFileSync(
    rankedPath,
    JSON.stringify(
      {
        version: 2,
        generatedAt,
        weightProfile: "tuned_v2",
        simulationOnly: true,
        readyForControlledIngest: wave1Simulation.readyForControlledIngest,
        ranked,
        wave1Simulation,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Wrote ${weightsPath}`);
  console.log(`Wrote ${validationPath}`);
  console.log(`Wrote ${reportPath}`);
  console.log(`Wrote ${rankedPath}`);
  console.log(`Wave 1 simulation v1 trust improved: ${wave1Simulation.retrievalTrustImprovedV1}`);
  console.log(`Wave 1 simulation v2 trust improved: ${wave1Simulation.retrievalTrustImprovedV2}`);
  console.log(`Ready for controlled ingest: ${wave1Simulation.readyForControlledIngest}`);
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
