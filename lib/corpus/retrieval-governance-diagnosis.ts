import type { Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import type { IngestionPriorityScoreResult } from "./ingestion-priority";
import {
  buildIngestionPriorityScore,
  estimateSemanticYieldFromTranscriptShape,
  scoreTopicCoverageGainText,
  transcriptLengthQualityBand,
} from "./ingestion-priority";
import {
  PRE_CALIBRATION_INGESTION_PRIORITY,
  TUNED_INGESTION_PRIORITY,
  TUNED_V1_INGESTION_PRIORITY,
} from "./retrieval-priority-weights";
import type { RetrievalQualityDimensionId, RetrievalQualityResult } from "./retrieval-quality";
import {
  acceptedPerHour,
  citationsPerHour,
  type VideoEvalSlice,
} from "./retrieval-weight-validation";

export type ProfileId = "pre_calibration" | "tuned_v1" | "tuned_v2";

export type CandidateDiagnosisRow = {
  id: string;
  videoId: string;
  channelName: string;
  videoTitle: string;
  targetTopics: string[];
  hasEvalSlice: boolean;
  priorityScorePre: number;
  priorityScoreTunedV1: number;
  priorityScoreTunedV2: number;
  citationsPerHour: number | null;
  acceptedPerHour: number | null;
  semanticMomentsPerHour: number | null;
  semanticYieldDim: number;
  clipExtractionDim: number;
  tutorialActionDim: number;
  researchWorkflowScore: number;
  topicCoverageGain: number;
  sourceQualityScore: number;
  retrievalOverall: number;
  shallowAuthorityFlag: boolean;
  transcriptPoisonMatchCount: number;
  rejectHeuristicMatches: string[];
  priorityBreakdownPre: IngestionPriorityScoreResult["breakdown"];
  priorityBreakdownTunedV2: IngestionPriorityScoreResult["breakdown"];
};

export type BatchObjectives = {
  videoIds: string[];
  citeWorthyPerHour_meanExcludingNull: number | null;
  citeWorthyPerHour_meanTreatNullAsZero: number | null;
  acceptedPerHour_mean: number | null;
  semanticMomentsPerHour_mean: number | null;
  semanticYieldDim_mean: number;
  clipExtractionDim_mean: number;
  researchWorkflowScore_mean: number;
  topicCoverageGain_mean: number;
  uniqueCreators: number;
  uniqueTopics: number;
  shallowAuthorityShare: number;
  transcriptPoisonFlagShare: number;
  meanPriorityScore: number;
};

export type OverlapMatrix = {
  pre_calibration: string[];
  tuned_v1: string[];
  tuned_v2: string[];
  sharedAllThree: string[];
  sharedPreAndV1: string[];
  sharedPreAndV2: string[];
  sharedV1AndV2: string[];
  uniquePre: string[];
  uniqueV1: string[];
  uniqueV2: string[];
  jaccardPreV1Top5: number;
  jaccardPreV2Top5: number;
  jaccardV1V2Top5: number;
};

export type SwapAnalysisRow = {
  videoId: string;
  title: string;
  channelName: string;
  inPreTop5: boolean;
  inV1Top5: boolean;
  inV2Top5: boolean;
  citationsPerHour: number | null;
  deltaCiteHourIfInVsOut: string;
  priorityDeltaPreToV2: number;
  topFactorPre: string;
  topFactorV2: string;
};

export type MisrankingRow = {
  videoId: string;
  title: string;
  channelName: string;
  kind: "obviously_good_ranks_low" | "obviously_weak_ranks_high";
  priorityScorePre: number;
  priorityScoreTunedV2: number;
  citationsPerHour: number | null;
  researchWorkflowScore: number;
  reason: string;
};

export type ManualReviewEntry = {
  videoId: string;
  title: string;
  channel: string;
  category: "uncertain" | "high_score_high_risk" | "low_score_high_potential";
  predictedStrengths: string[];
  predictedRisks: string[];
  whyHumanReviewNeeded: string;
};

export type GovernanceRecommendation =
  | "retune_weights"
  | "change_objective"
  | "expand_candidate_pool"
  | "manual_review_required"
  | "ready_for_controlled_ingest";

export type RetrievalGovernanceDiagnosis = {
  generatedAt: string;
  wave1CandidateCount: number;
  evalSliceCount: number;
  answers: {
    candidatesTooSimilar: boolean;
    candidatesTooSimilarDetail: string;
    sameVideosInAllTop5: boolean;
    top5OverlapDetail: string;
    citeHourPenalizesTutorials: boolean;
    citeHourPenalizesTutorialsDetail: string;
    sourcePriorsOverpowerRetrieval: boolean;
    sourcePriorsOverpowerDetail: string;
    penaltiesSuppressTechnical: boolean;
    penaltiesSuppressTechnicalDetail: string;
    batchMetricMethodologySkewsPre: boolean;
    batchMetricMethodologyDetail: string;
  };
  overlapTop5: OverlapMatrix;
  overlapTop10: OverlapMatrix;
  batchObjectivesTop5: Record<ProfileId, BatchObjectives>;
  batchObjectivesTop10: Record<ProfileId, BatchObjectives>;
  swaps: SwapAnalysisRow[];
  misrankings: MisrankingRow[];
  manualReviewShortlist: {
    uncertain: ManualReviewEntry[];
    highScoreHighRisk: ManualReviewEntry[];
    lowScoreHighPotential: ManualReviewEntry[];
  };
  recommendation: GovernanceRecommendation;
  recommendationRationale: string[];
};

function dimNorm(r: RetrievalQualityResult, id: RetrievalQualityDimensionId): number {
  return r.dimensions.find((d) => d.id === id)?.normalized ?? 0;
}

function researchWorkflowScore(rq: RetrievalQualityResult): number {
  return (
    dimNorm(rq, "explanation_density") * 0.35 +
    dimNorm(rq, "technical_terminology_density") * 0.3 +
    dimNorm(rq, "question_answer_density") * 0.2 +
    dimNorm(rq, "concrete_example_density") * 0.15
  );
}

function shallowAuthorityHeuristic(slice: VideoEvalSlice | undefined, channelName: string): boolean {
  if (slice?.retrieval.flags.poorCitationValue || slice?.retrieval.flags.weakEducationalDensity) {
    return true;
  }
  return /\b(podcast|fridman|dwarkesh|rogan|interview)\b/i.test(channelName);
}

function topBreakdownFactor(breakdown: IngestionPriorityScoreResult["breakdown"]): string {
  const sorted = [...breakdown].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const top = sorted[0];
  return top ? `${top.factor} (${top.contribution.toFixed(1)})` : "—";
}

function sourceContributionShare(breakdown: IngestionPriorityScoreResult["breakdown"]): number {
  const pos = breakdown.filter((b) => b.contribution > 0).reduce((s, b) => s + b.contribution, 0);
  const src = breakdown.find((b) => b.factor === "source_quality_0_1")?.contribution ?? 0;
  return pos > 0 ? src / pos : 0;
}

export function buildCandidateDiagnosisRows(params: {
  candidates: Wave1PlanCandidate[];
  videoById: Map<string, VideoEvalSlice>;
  momentCountByChannel: Map<string, number>;
  scoreMaps: {
    pre: Map<string, IngestionPriorityScoreResult>;
    v1: Map<string, IngestionPriorityScoreResult>;
    v2: Map<string, IngestionPriorityScoreResult>;
  };
}): CandidateDiagnosisRow[] {
  const rows: CandidateDiagnosisRow[] = [];
  for (const c of params.candidates) {
    const slice = params.videoById.get(c.videoId);
    const ch = c.channelName.trim() || "unknown_channel";
    const dup = Math.min(1, (params.momentCountByChannel.get(ch) ?? 0) / 42);
    const diversity = 1 - dup * 0.85;
    const semEst = estimateSemanticYieldFromTranscriptShape(
      slice?.segmentCount ?? Math.max(24, Math.floor((c.durationMinutesEstimate ?? 55) * 2.8)),
      c.durationMinutesEstimate
    );
    const lenBand = transcriptLengthQualityBand(
      slice?.segmentCount ?? 0,
      c.durationMinutesEstimate
    );

    const basePriority = {
      sourceQuality: c.sourceQuality,
      retrievalQuality: slice?.retrieval ?? {
        videoId: c.videoId,
        overallNormalized: 0.4,
        tier: "C",
        dimensions: [],
        rejectHeuristics: [],
        flags: {
          lowRetrievalValue: true,
          poorCitationValue: true,
          weakEducationalDensity: true,
          reasons: ["no_eval_slice"],
        },
      },
      topicCoverageGainText: c.expectedTopicCoverageGain,
      semanticYieldEstimate: semEst,
      corpusDiversityBonus: diversity,
      creatorDuplicationPenalty: dup,
      transcriptLengthQualityBand: lenBand,
      segmentCount: slice?.segmentCount ?? 0,
    };

    const pre =
      params.scoreMaps.pre.get(c.videoId) ??
      buildIngestionPriorityScore({ ...basePriority, weights: PRE_CALIBRATION_INGESTION_PRIORITY });
    const v1 =
      params.scoreMaps.v1.get(c.videoId) ??
      buildIngestionPriorityScore({ ...basePriority, weights: TUNED_V1_INGESTION_PRIORITY });
    const v2 =
      params.scoreMaps.v2.get(c.videoId) ??
      buildIngestionPriorityScore({ ...basePriority, weights: TUNED_INGESTION_PRIORITY });

    const rq = basePriority.retrievalQuality;
    const poison = rq.rejectHeuristics.filter((h) => h.matched).map((h) => h.id);

    rows.push({
      id: c.id,
      videoId: c.videoId,
      channelName: c.channelName,
      videoTitle: c.videoTitle,
      targetTopics: c.targetTopics ?? [],
      hasEvalSlice: Boolean(slice),
      priorityScorePre: pre.priorityScore,
      priorityScoreTunedV1: v1.priorityScore,
      priorityScoreTunedV2: v2.priorityScore,
      citationsPerHour: slice ? citationsPerHour(slice) : null,
      acceptedPerHour: slice ? acceptedPerHour(slice) : null,
      semanticMomentsPerHour: slice?.research.semanticMomentsPerTranscriptHour ?? null,
      semanticYieldDim: dimNorm(rq, "semantic_moment_yield"),
      clipExtractionDim: dimNorm(rq, "clip_extraction_quality"),
      tutorialActionDim: dimNorm(rq, "actionable_tutorial_density"),
      researchWorkflowScore: researchWorkflowScore(rq),
      topicCoverageGain: scoreTopicCoverageGainText(c.expectedTopicCoverageGain),
      sourceQualityScore: c.sourceQuality.score,
      retrievalOverall: rq.overallNormalized,
      shallowAuthorityFlag: shallowAuthorityHeuristic(slice, c.channelName),
      transcriptPoisonMatchCount: poison.length,
      rejectHeuristicMatches: poison,
      priorityBreakdownPre: pre.breakdown,
      priorityBreakdownTunedV2: v2.breakdown,
    });
  }
  return rows;
}

export function rankVideoIdsByProfile(
  rows: CandidateDiagnosisRow[],
  profile: ProfileId
): string[] {
  const key =
    profile === "pre_calibration"
      ? "priorityScorePre"
      : profile === "tuned_v1"
        ? "priorityScoreTunedV1"
        : "priorityScoreTunedV2";
  return [...rows]
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .map((r) => r.videoId);
}

function mean(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export function computeBatchObjectives(
  videoIds: string[],
  rowById: Map<string, CandidateDiagnosisRow>,
  profile: ProfileId
): BatchObjectives {
  const rows = videoIds.map((id) => rowById.get(id)).filter(Boolean) as CandidateDiagnosisRow[];
  const citeVals = rows.map((r) => r.citationsPerHour);
  const citeNonNull = citeVals.filter((x): x is number => x != null);
  const citeAll = citeVals.map((x) => x ?? 0);

  const scoreKey =
    profile === "pre_calibration"
      ? "priorityScorePre"
      : profile === "tuned_v1"
        ? "priorityScoreTunedV1"
        : "priorityScoreTunedV2";

  return {
    videoIds,
    citeWorthyPerHour_meanExcludingNull: mean(citeNonNull),
    citeWorthyPerHour_meanTreatNullAsZero: mean(citeAll),
    acceptedPerHour_mean: mean(
      rows.map((r) => r.acceptedPerHour).filter((x): x is number => x != null)
    ),
    semanticMomentsPerHour_mean: mean(
      rows.map((r) => r.semanticMomentsPerHour).filter((x): x is number => x != null)
    ),
    semanticYieldDim_mean: mean(rows.map((r) => r.semanticYieldDim)) ?? 0,
    clipExtractionDim_mean: mean(rows.map((r) => r.clipExtractionDim)) ?? 0,
    researchWorkflowScore_mean: mean(rows.map((r) => r.researchWorkflowScore)) ?? 0,
    topicCoverageGain_mean: mean(rows.map((r) => r.topicCoverageGain)) ?? 0,
    uniqueCreators: new Set(rows.map((r) => r.channelName)).size,
    uniqueTopics: new Set(rows.flatMap((r) => r.targetTopics)).size,
    shallowAuthorityShare: rows.length
      ? rows.filter((r) => r.shallowAuthorityFlag).length / rows.length
      : 0,
    transcriptPoisonFlagShare: rows.length
      ? rows.filter((r) => r.transcriptPoisonMatchCount > 0).length / rows.length
      : 0,
    meanPriorityScore: mean(rows.map((r) => r[scoreKey] as number)) ?? 0,
  };
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) {
    if (sb.has(x)) inter += 1;
  }
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

export function buildOverlapMatrix(
  preTop: string[],
  v1Top: string[],
  v2Top: string[]
): OverlapMatrix {
  const sp = new Set(preTop);
  const s1 = new Set(v1Top);
  const s2 = new Set(v2Top);

  const sharedAll = preTop.filter((id) => s1.has(id) && s2.has(id));
  const sharedPreV1 = preTop.filter((id) => s1.has(id));
  const sharedPreV2 = preTop.filter((id) => s2.has(id));
  const sharedV1V2 = v1Top.filter((id) => s2.has(id));

  return {
    pre_calibration: preTop,
    tuned_v1: v1Top,
    tuned_v2: v2Top,
    sharedAllThree: sharedAll,
    sharedPreAndV1: sharedPreV1,
    sharedPreAndV2: sharedPreV2,
    sharedV1AndV2: sharedV1V2,
    uniquePre: preTop.filter((id) => !s1.has(id) && !s2.has(id)),
    uniqueV1: v1Top.filter((id) => !sp.has(id) && !s2.has(id)),
    uniqueV2: v2Top.filter((id) => !sp.has(id) && !s1.has(id)),
    jaccardPreV1Top5: jaccard(preTop, v1Top),
    jaccardPreV2Top5: jaccard(preTop, v2Top),
    jaccardV1V2Top5: jaccard(v1Top, v2Top),
  };
}

export function buildSwapAnalysis(
  rows: CandidateDiagnosisRow[],
  preTop5: string[],
  v1Top5: string[],
  v2Top5: string[]
): SwapAnalysisRow[] {
  const rowById = new Map(rows.map((r) => [r.videoId, r]));
  const allIds = new Set([...preTop5, ...v1Top5, ...v2Top5, ...rows.map((r) => r.videoId)]);

  const preSet = new Set(preTop5);
  const v1Set = new Set(v1Top5);
  const v2Set = new Set(v2Top5);

  const out: SwapAnalysisRow[] = [];
  for (const id of allIds) {
    const r = rowById.get(id);
    if (!r) continue;
    const inPre = preSet.has(id);
    const inV1 = v1Set.has(id);
    const inV2 = v2Set.has(id);
    if (!inPre && !inV1 && !inV2) continue;

    let deltaCite = "n/a";
    const cite = r.citationsPerHour;
    if (cite != null) {
      if (inV2 && !inPre) deltaCite = `+${cite.toFixed(2)} cite/h entering v2 top-5`;
      else if (inPre && !inV2) deltaCite = `−${cite.toFixed(2)} cite/h leaving pre top-5`;
      else if (inPre && inV2) deltaCite = "retained in pre and v2 top-5";
      else deltaCite = "not in pre/v2 top-5";
    } else if (inPre !== inV2) {
      deltaCite = inPre
        ? "left v2 top-5 (cite/h unknown — was excluded from pre batch mean)"
        : "entered v2 top-5 (cite/h unknown — counts as 0 in tuned mean)";
    }

    out.push({
      videoId: id,
      title: r.videoTitle,
      channelName: r.channelName,
      inPreTop5: inPre,
      inV1Top5: inV1,
      inV2Top5: inV2,
      citationsPerHour: cite,
      deltaCiteHourIfInVsOut: deltaCite,
      priorityDeltaPreToV2: r.priorityScoreTunedV2 - r.priorityScorePre,
      topFactorPre: topBreakdownFactor(r.priorityBreakdownPre),
      topFactorV2: topBreakdownFactor(r.priorityBreakdownTunedV2),
    });
  }
  return out.sort((a, b) => Math.abs(b.priorityDeltaPreToV2) - Math.abs(a.priorityDeltaPreToV2));
}

export function detectMisrankings(rows: CandidateDiagnosisRow[]): MisrankingRow[] {
  const out: MisrankingRow[] = [];
  for (const r of rows) {
    const cite = r.citationsPerHour ?? 0;
    const highResearch =
      cite >= 0.9 || r.semanticYieldDim >= 0.35 || r.clipExtractionDim >= 0.65;
    const lowPriority = r.priorityScoreTunedV2 < 48 && r.priorityScorePre < 55;
    if (highResearch && lowPriority && r.hasEvalSlice) {
      out.push({
        videoId: r.videoId,
        title: r.videoTitle,
        channelName: r.channelName,
        kind: "obviously_good_ranks_low",
        priorityScorePre: r.priorityScorePre,
        priorityScoreTunedV2: r.priorityScoreTunedV2,
        citationsPerHour: r.citationsPerHour,
        researchWorkflowScore: r.researchWorkflowScore,
        reason: `Strong cite/h (${r.citationsPerHour?.toFixed(2) ?? "—"}) or semantic/clip dims but priority ≤48 (v2=${r.priorityScoreTunedV2}).`,
      });
    }

    const weakResearch =
      (r.citationsPerHour ?? 0) < 0.25 &&
      r.semanticYieldDim < 0.2 &&
      r.clipExtractionDim < 0.5 &&
      r.transcriptPoisonMatchCount >= 2;
    const highPriority = r.priorityScoreTunedV2 >= 58 || r.priorityScorePre >= 68;
    if (weakResearch && highPriority) {
      out.push({
        videoId: r.videoId,
        title: r.videoTitle,
        channelName: r.channelName,
        kind: "obviously_weak_ranks_high",
        priorityScorePre: r.priorityScorePre,
        priorityScoreTunedV2: r.priorityScoreTunedV2,
        citationsPerHour: r.citationsPerHour,
        researchWorkflowScore: r.researchWorkflowScore,
        reason: `Low cite/h and weak extraction signals but priority ≥58 (pre=${r.priorityScorePre}, v2=${r.priorityScoreTunedV2}); likely source/tutorial length priors.`,
      });
    }
  }
  return out;
}

export function buildManualReviewShortlist(rows: CandidateDiagnosisRow[]): RetrievalGovernanceDiagnosis["manualReviewShortlist"] {
  const uncertain = rows
    .filter((r) => {
      const spread = Math.max(r.priorityScorePre, r.priorityScoreTunedV2) -
        Math.min(r.priorityScorePre, r.priorityScoreTunedV2);
      return (
        spread >= 12 &&
        (r.citationsPerHour == null || (r.citationsPerHour > 0.4 && r.citationsPerHour < 1.1))
      );
    })
    .slice(0, 10);

  const highScoreHighRisk = rows
    .filter(
      (r) =>
        (r.priorityScoreTunedV2 >= 55 || r.priorityScorePre >= 65) &&
        (r.shallowAuthorityFlag || r.transcriptPoisonMatchCount > 0 || (r.citationsPerHour ?? 0) < 0.3)
    )
    .sort((a, b) => b.priorityScoreTunedV2 - a.priorityScoreTunedV2)
    .slice(0, 10);

  const lowScoreHighPotential = rows
    .filter(
      (r) =>
        r.priorityScoreTunedV2 < 50 &&
        ((r.citationsPerHour ?? 0) >= 0.85 || r.clipExtractionDim >= 0.7)
    )
    .sort((a, b) => (b.citationsPerHour ?? 0) - (a.citationsPerHour ?? 0))
    .slice(0, 10);

  function toEntry(
    r: CandidateDiagnosisRow,
    category: ManualReviewEntry["category"]
  ): ManualReviewEntry {
    const strengths: string[] = [];
    const risks: string[] = [];
    if ((r.citationsPerHour ?? 0) >= 0.8) strengths.push("high cite/h in corpus");
    if (r.clipExtractionDim >= 0.65) strengths.push("strong clip extraction dim");
    if (r.tutorialActionDim >= 0.45) strengths.push("dense tutorial/procedural transcript");
    if (r.sourceQualityScore >= 95) strengths.push("allowlist A-tier source prior");
    if (r.shallowAuthorityFlag) risks.push("shallow authority / interview-shaped");
    if (r.transcriptPoisonMatchCount > 0) risks.push(`transcript poison heuristics (${r.transcriptPoisonMatchCount})`);
    if (r.citationsPerHour == null) risks.push("cite/h not measurable (no materialized moments)");
    if ((r.citationsPerHour ?? 0) < 0.3) risks.push("low cite/h despite high priority");

    let why = "Borderline governance signals; ranking unstable across profiles.";
    if (category === "high_score_high_risk") {
      why = "Scores high for ingest but research-density or poison flags disagree.";
    }
    if (category === "low_score_high_potential") {
      why = "Under-ranked by priority score despite strong density or extraction proxies.";
    }

    return {
      videoId: r.videoId,
      title: r.videoTitle,
      channel: r.channelName,
      category,
      predictedStrengths: strengths,
      predictedRisks: risks,
      whyHumanReviewNeeded: why,
    };
  }

  return {
    uncertain: uncertain.map((r) => toEntry(r, "uncertain")),
    highScoreHighRisk: highScoreHighRisk.map((r) => toEntry(r, "high_score_high_risk")),
    lowScoreHighPotential: lowScoreHighPotential.map((r) => toEntry(r, "low_score_high_potential")),
  };
}

export function deriveRecommendation(params: {
  rows: CandidateDiagnosisRow[];
  overlapTop5: OverlapMatrix;
  batchTop5: Record<ProfileId, BatchObjectives>;
  misrankings: MisrankingRow[];
  tutorialCiteCorrelation: number | null;
  meanSourceSharePre: number;
  meanSourceShareV2: number;
}): { recommendation: GovernanceRecommendation; rationale: string[] } {
  const rationale: string[] = [];
  const { overlapTop5, batchTop5, misrankings } = params;

  const pre = batchTop5.pre_calibration;
  const v2 = batchTop5.tuned_v2;

  const methodologySkew =
    pre.citeWorthyPerHour_meanExcludingNull != null &&
    v2.citeWorthyPerHour_meanTreatNullAsZero != null &&
    pre.citeWorthyPerHour_meanExcludingNull - v2.citeWorthyPerHour_meanTreatNullAsZero > 0.12;

  if (methodologySkew) {
    rationale.push(
      `Batch cite/h gate is skewed: pre top-5 mean ${pre.citeWorthyPerHour_meanExcludingNull?.toFixed(3)} excludes null cite/h rows; tuned mean ${v2.citeWorthyPerHour_meanTreatNullAsZero?.toFixed(3)} treats missing as zero — compares unlike denominators.`
    );
  }

  if (overlapTop5.sharedAllThree.length >= 4) {
    rationale.push(
      `Top-5 overlap is very high (${overlapTop5.sharedAllThree.length}/5 shared across all profiles; Jaccard pre↔v2=${overlapTop5.jaccardPreV2Top5.toFixed(2)}). Weight changes mostly reorder marginally, not rebuild the batch.`
    );
  }

  if (
    pre.citeWorthyPerHour_meanTreatNullAsZero != null &&
    v2.citeWorthyPerHour_meanTreatNullAsZero != null &&
    Math.abs(pre.citeWorthyPerHour_meanTreatNullAsZero - v2.citeWorthyPerHour_meanTreatNullAsZero) < 0.03
  ) {
    rationale.push(
      `With fair comparison (null cite/h as 0), pre and v2 top-5 cite/h means are nearly identical (${pre.citeWorthyPerHour_meanTreatNullAsZero.toFixed(3)} vs ${v2.citeWorthyPerHour_meanTreatNullAsZero.toFixed(3)}). Tuning failed because the batch barely changed.`
    );
  }

  if (params.meanSourceSharePre > 0.22) {
    rationale.push(
      `Pre-calibration priority is ~${(params.meanSourceSharePre * 100).toFixed(0)}% driven by source_quality factor; allowlist scores cluster at 100, overpowering retrieval signals.`
    );
  }

  const goodLow = misrankings.filter((m) => m.kind === "obviously_good_ranks_low").length;
  const weakHigh = misrankings.filter((m) => m.kind === "obviously_weak_ranks_high").length;
  if (goodLow + weakHigh >= 4) {
    rationale.push(
      `${goodLow} under-ranked high-potential and ${weakHigh} over-ranked weak candidates — human judgment needed before trusting automation.`
    );
  }

  const uniqueChannels = new Set(params.rows.map((r) => r.channelName)).size;
  if (uniqueChannels <= 12 && params.rows.length >= 30) {
    rationale.push(
      `Wave 1 pool is homogeneous (${uniqueChannels} channels / ${params.rows.length} candidates); limited room for tuning to change top-batch research density.`
    );
  }

  if (params.tutorialCiteCorrelation != null && params.tutorialCiteCorrelation > 0.15) {
    rationale.push(
      `Tutorial/action density correlates positively with cite/h (r≈${params.tutorialCiteCorrelation.toFixed(2)}) — cite/h alone is not penalizing tutorials; null/zero cite/h on non-materialized videos is the larger distortion.`
    );
  }

  let recommendation: GovernanceRecommendation = "manual_review_required";

  if (methodologySkew) {
    recommendation = "change_objective";
  }
  if (goodLow + weakHigh >= 6) {
    recommendation = "manual_review_required";
  }
  if (uniqueChannels <= 10) {
    recommendation = recommendation === "change_objective" ? "change_objective" : "expand_candidate_pool";
  }
  if (
    params.meanSourceShareV2 < 0.12 &&
    goodLow >= 3 &&
    !methodologySkew
  ) {
    recommendation = "retune_weights";
  }

  const v2BetterOnMulti =
    v2.semanticYieldDim_mean > pre.semanticYieldDim_mean + 0.02 ||
    v2.clipExtractionDim_mean > pre.clipExtractionDim_mean + 0.02;
  const v2BetterCiteFair =
    pre.citeWorthyPerHour_meanTreatNullAsZero != null &&
    v2.citeWorthyPerHour_meanTreatNullAsZero != null &&
    v2.citeWorthyPerHour_meanTreatNullAsZero > pre.citeWorthyPerHour_meanTreatNullAsZero + 0.02;

  if (v2BetterCiteFair && v2BetterOnMulti && goodLow < 3 && weakHigh < 3) {
    recommendation = "ready_for_controlled_ingest";
    rationale.push("Fair metrics show v2 improvement on cite/h and extraction dims with few misrankings.");
  } else {
    rationale.push(
      "ready_for_controlled_ingest is NOT supported: tuned profiles do not reliably beat pre-calibration on fair cite/h and multi-objective top-5 metrics."
    );
  }

  return { recommendation, rationale };
}

export function formatDiagnosisMarkdown(d: RetrievalGovernanceDiagnosis): string {
  const lines: string[] = [];
  lines.push("# Retrieval governance — diagnostic report");
  lines.push("");
  lines.push(`Generated: ${d.generatedAt}`);
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(`**Recommendation: \`${d.recommendation}\`**`);
  lines.push("");
  for (const r of d.recommendationRationale) {
    lines.push(`- ${r}`);
  }
  lines.push("");
  lines.push("## Diagnostic questions");
  lines.push("");
  lines.push(`### Are Wave 1 candidates too similar?`);
  lines.push("");
  lines.push(d.answers.candidatesTooSimilarDetail);
  lines.push("");
  lines.push(`### Same videos in all top-5 profiles?`);
  lines.push("");
  lines.push(d.answers.top5OverlapDetail);
  lines.push("");
  lines.push(`### Does cite/h penalize tutorials?`);
  lines.push("");
  lines.push(d.answers.citeHourPenalizesTutorialsDetail);
  lines.push("");
  lines.push(`### Do source priors overpower retrieval quality?`);
  lines.push("");
  lines.push(d.answers.sourcePriorsOverpowerDetail);
  lines.push("");
  lines.push(`### Do penalties suppress good technical content?`);
  lines.push("");
  lines.push(d.answers.penaltiesSuppressTechnicalDetail);
  lines.push("");
  lines.push(`### Batch metric methodology`);
  lines.push("");
  lines.push(d.answers.batchMetricMethodologyDetail);
  lines.push("");
  lines.push("## Top-5 overlap matrix");
  lines.push("");
  lines.push(`| Set | Count | IDs |`);
  lines.push(`|-----|------:|-----|`);
  lines.push(`| Shared all three | ${d.overlapTop5.sharedAllThree.length} | ${d.overlapTop5.sharedAllThree.join(", ")} |`);
  lines.push(`| Unique pre | ${d.overlapTop5.uniquePre.length} | ${d.overlapTop5.uniquePre.join(", ") || "—"} |`);
  lines.push(`| Unique v1 | ${d.overlapTop5.uniqueV1.length} | ${d.overlapTop5.uniqueV1.join(", ") || "—"} |`);
  lines.push(`| Unique v2 | ${d.overlapTop5.uniqueV2.length} | ${d.overlapTop5.uniqueV2.join(", ") || "—"} |`);
  lines.push("");
  lines.push("## Top-5 multi-objective comparison (fair cite/h = null as 0)");
  lines.push("");
  lines.push("| Profile | cite/h (excl null) | cite/h (null=0) | accepted/h | semantic yield dim | clip dim | creators | topics |");
  lines.push("|---------|-------------------:|----------------:|-----------:|-------------------:|---------:|---------:|-------:|");
  for (const pid of ["pre_calibration", "tuned_v1", "tuned_v2"] as ProfileId[]) {
    const b = d.batchObjectivesTop5[pid];
    lines.push(
      `| ${pid} | ${b.citeWorthyPerHour_meanExcludingNull?.toFixed(3) ?? "—"} | ${b.citeWorthyPerHour_meanTreatNullAsZero?.toFixed(3) ?? "—"} | ${b.acceptedPerHour_mean?.toFixed(3) ?? "—"} | ${b.semanticYieldDim_mean.toFixed(3)} | ${b.clipExtractionDim_mean.toFixed(3)} | ${b.uniqueCreators} | ${b.uniqueTopics} |`
    );
  }
  lines.push("");
  lines.push("## Candidate swaps (top-5 membership)");
  lines.push("");
  lines.push("| Video | Pre | V1 | V2 | cite/h | swap note |");
  lines.push("|-------|:---:|:--:|:--:|-------:|----------|");
  for (const s of d.swaps.filter((x) => x.inPreTop5 || x.inV1Top5 || x.inV2Top5).slice(0, 12)) {
    lines.push(
      `| ${s.videoId} | ${s.inPreTop5 ? "✓" : ""} | ${s.inV1Top5 ? "✓" : ""} | ${s.inV2Top5 ? "✓" : ""} | ${s.citationsPerHour?.toFixed(2) ?? "—"} | ${s.deltaCiteHourIfInVsOut} |`
    );
  }
  lines.push("");
  lines.push("## Misrankings");
  lines.push("");
  for (const m of d.misrankings.slice(0, 15)) {
    lines.push(`- **${m.kind}** \`${m.videoId}\` (${m.channelName}): ${m.reason}`);
  }
  lines.push("");
  return lines.join("\n");
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 4) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
}

export function runRetrievalGovernanceDiagnosis(params: {
  candidates: Wave1PlanCandidate[];
  videoById: Map<string, VideoEvalSlice>;
  momentCountByChannel: Map<string, number>;
}): RetrievalGovernanceDiagnosis {
  const scoreMaps = {
    pre: new Map<string, IngestionPriorityScoreResult>(),
    v1: new Map<string, IngestionPriorityScoreResult>(),
    v2: new Map<string, IngestionPriorityScoreResult>(),
  };

  for (const c of params.candidates) {
    const slice = params.videoById.get(c.videoId);
    const ch = c.channelName.trim() || "unknown_channel";
    const dup = Math.min(1, (params.momentCountByChannel.get(ch) ?? 0) / 42);
    const diversity = 1 - dup * 0.85;
    const semEst = estimateSemanticYieldFromTranscriptShape(
      slice?.segmentCount ?? Math.max(24, Math.floor((c.durationMinutesEstimate ?? 55) * 2.8)),
      c.durationMinutesEstimate
    );
    const lenBand = transcriptLengthQualityBand(
      slice?.segmentCount ?? 0,
      c.durationMinutesEstimate
    );
    if (!slice) continue;
    const base = {
      sourceQuality: c.sourceQuality,
      retrievalQuality: slice.retrieval,
      topicCoverageGainText: c.expectedTopicCoverageGain,
      semanticYieldEstimate: semEst,
      corpusDiversityBonus: diversity,
      creatorDuplicationPenalty: dup,
      transcriptLengthQualityBand: lenBand,
      segmentCount: slice?.segmentCount ?? 0,
    };
    if (!slice) continue;
    scoreMaps.pre.set(
      c.videoId,
      buildIngestionPriorityScore({ ...base, weights: PRE_CALIBRATION_INGESTION_PRIORITY })
    );
    scoreMaps.v1.set(
      c.videoId,
      buildIngestionPriorityScore({ ...base, weights: TUNED_V1_INGESTION_PRIORITY })
    );
    scoreMaps.v2.set(
      c.videoId,
      buildIngestionPriorityScore({ ...base, weights: TUNED_INGESTION_PRIORITY })
    );
  }

  const rows = buildCandidateDiagnosisRows({
    candidates: params.candidates,
    videoById: params.videoById,
    momentCountByChannel: params.momentCountByChannel,
    scoreMaps,
  });
  const rowById = new Map(rows.map((r) => [r.videoId, r]));

  const preRank = rankVideoIdsByProfile(rows, "pre_calibration");
  const v1Rank = rankVideoIdsByProfile(rows, "tuned_v1");
  const v2Rank = rankVideoIdsByProfile(rows, "tuned_v2");

  const preTop5 = preRank.slice(0, 5);
  const v1Top5 = v1Rank.slice(0, 5);
  const v2Top5 = v2Rank.slice(0, 5);
  const preTop10 = preRank.slice(0, 10);
  const v1Top10 = v1Rank.slice(0, 10);
  const v2Top10 = v2Rank.slice(0, 10);

  const overlapTop5 = buildOverlapMatrix(preTop5, v1Top5, v2Top5);
  const overlapTop10 = buildOverlapMatrix(preTop10, v1Top10, v2Top10);

  const batchObjectivesTop5 = {
    pre_calibration: computeBatchObjectives(preTop5, rowById, "pre_calibration"),
    tuned_v1: computeBatchObjectives(v1Top5, rowById, "tuned_v1"),
    tuned_v2: computeBatchObjectives(v2Top5, rowById, "tuned_v2"),
  };
  const batchObjectivesTop10 = {
    pre_calibration: computeBatchObjectives(preTop10, rowById, "pre_calibration"),
    tuned_v1: computeBatchObjectives(v1Top10, rowById, "tuned_v1"),
    tuned_v2: computeBatchObjectives(v2Top10, rowById, "tuned_v2"),
  };

  const withCite = rows.filter((r) => r.citationsPerHour != null);
  const tutorialCiteCorrelation = pearson(
    withCite.map((r) => r.tutorialActionDim),
    withCite.map((r) => r.citationsPerHour!)
  );

  const evalRows = rows.filter((r) => r.hasEvalSlice);
  const meanSourceSharePre =
    evalRows.reduce((s, r) => s + sourceContributionShare(
      scoreMaps.pre.get(r.videoId)!.breakdown
    ), 0) / Math.max(1, evalRows.length);
  const meanSourceShareV2 =
    evalRows.reduce((s, r) => s + sourceContributionShare(
      scoreMaps.v2.get(r.videoId)!.breakdown
    ), 0) / Math.max(1, evalRows.length);

  const misrankings = detectMisrankings(rows);
  const manualReviewShortlist = buildManualReviewShortlist(rows);
  const swaps = buildSwapAnalysis(rows, preTop5, v1Top5, v2Top5);

  const uniqueChannels = new Set(rows.map((r) => r.channelName)).size;
  const { recommendation, rationale } = deriveRecommendation({
    rows,
    overlapTop5,
    batchTop5: batchObjectivesTop5,
    misrankings,
    tutorialCiteCorrelation,
    meanSourceSharePre,
    meanSourceShareV2,
  });

  return {
    generatedAt: new Date().toISOString(),
    wave1CandidateCount: params.candidates.length,
    evalSliceCount: rows.filter((r) => r.hasEvalSlice).length,
    answers: {
      candidatesTooSimilar: uniqueChannels <= 14,
      candidatesTooSimilarDetail: `Wave 1 has ${params.candidates.length} candidates across ${uniqueChannels} channels; ${overlapTop5.sharedAllThree.length}/5 top-5 slots are identical across pre/v1/v2. Tuning reorders scores but rarely changes the research-value frontier.`,
      sameVideosInAllTop5: overlapTop5.sharedAllThree.length >= 4,
      top5OverlapDetail: `Shared: ${overlapTop5.sharedAllThree.join(", ")}. Jaccard pre↔v1=${overlapTop5.jaccardPreV1Top5.toFixed(2)}, pre↔v2=${overlapTop5.jaccardPreV2Top5.toFixed(2)}, v1↔v2=${overlapTop5.jaccardV1V2Top5.toFixed(2)}. Swaps: pre-only ${overlapTop5.uniquePre.join(", ") || "—"}; v2-only ${overlapTop5.uniqueV2.join(", ") || "—"}.`,
      citeHourPenalizesTutorials: tutorialCiteCorrelation != null && tutorialCiteCorrelation > 0,
      citeHourPenalizesTutorialsDetail:
        tutorialCiteCorrelation != null
          ? `Tutorial/action dim vs cite/h correlation r=${tutorialCiteCorrelation.toFixed(3)} — tutorials are not systematically punished by cite/h; missing materialized moments (null cite/h) distort batch comparisons.`
          : "Insufficient data for tutorial vs cite/h correlation.",
      sourcePriorsOverpowerRetrieval: meanSourceSharePre > 0.18,
      sourcePriorsOverpowerDetail: `Pre-calibration positive priority mass is ~${(meanSourceSharePre * 100).toFixed(0)}% from source_quality (many A-tier=100 scores). Tuned v2 reduces this to ~${(meanSourceShareV2 * 100).toFixed(0)}% but overlap keeps batch cite/h flat.`,
      penaltiesSuppressTechnical:
        rows.filter((r) => r.tutorialActionDim >= 0.45 && r.transcriptPoisonMatchCount > 0).length > 0,
      penaltiesSuppressTechnicalDetail:
        "Governance penalties target poison/CTA heuristics; tutorial-dense rows with high action dim generally retain priority via technical/tutorial boosts and drift heuristic sparing (action≥0.45).",
      batchMetricMethodologySkewsPre:
        batchObjectivesTop5.pre_calibration.citeWorthyPerHour_meanExcludingNull != null &&
        batchObjectivesTop5.tuned_v2.citeWorthyPerHour_meanTreatNullAsZero != null &&
        (batchObjectivesTop5.pre_calibration.citeWorthyPerHour_meanExcludingNull ?? 0) >
          (batchObjectivesTop5.tuned_v2.citeWorthyPerHour_meanTreatNullAsZero ?? 0) + 0.1,
      batchMetricMethodologyDetail: `Pre top-5 cite/h mean excluding null = ${batchObjectivesTop5.pre_calibration.citeWorthyPerHour_meanExcludingNull?.toFixed(3) ?? "—"}; tuned v2 with null=0 = ${batchObjectivesTop5.tuned_v2.citeWorthyPerHour_meanTreatNullAsZero?.toFixed(3) ?? "—"}. Fair comparison (both null=0): pre ${batchObjectivesTop5.pre_calibration.citeWorthyPerHour_meanTreatNullAsZero?.toFixed(3)} vs v2 ${batchObjectivesTop5.tuned_v2.citeWorthyPerHour_meanTreatNullAsZero?.toFixed(3)}.`,
    },
    overlapTop5,
    overlapTop10,
    batchObjectivesTop5,
    batchObjectivesTop10,
    swaps,
    misrankings,
    manualReviewShortlist,
    recommendation,
    recommendationRationale: rationale,
  };
}
