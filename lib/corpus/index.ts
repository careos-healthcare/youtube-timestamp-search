export type * from "./source-types";
export { loadAllAllowlistEntries, findAllowlistMatch, listAllowlistFilesMeta, normalizeChannelName } from "./source-allowlists";
export { scoreIngestionSource } from "./source-quality";
export { explainIngestionTier, explainIngestionRecommendation, formatScoreReasons } from "./source-score-explanations";
export {
  enqueueSource,
  rejectSource,
  promoteSource,
  dedupeSource,
  markIndexed,
  listQueue,
  enqueueRequestedSource,
} from "./ingestion-queue";
export { recordCorpusPipelineEvent } from "./corpus-analytics";
export { tokenJaccard, titlesLikelyDuplicate, phraseSaturationByTopic, dedupeVideoTitles } from "./dedupe";
export { buildTopicCoverageReport, averageQualityTierShare } from "./topic-coverage";
export type { TopicCoverageRow } from "./topic-coverage";
export { buildMissingCorpusReport } from "./missing-corpus";
export type { MissingCorpusFinding, SourceIndexRequestRecord } from "./missing-corpus";
export { WAVE1_TARGET_TOPICS, WAVE1_TARGET_TOPIC_SET } from "./ingestion-wave-1-target-topics";
export type { Wave1TargetTopic } from "./ingestion-wave-1-target-topics";
export {
  buildRetrievalCalibrationReport,
  formatRetrievalCalibrationMarkdown,
  estimateTranscriptHoursFromSegments,
} from "./retrieval-calibration";
export type {
  RetrievalCalibrationSummary,
  RetrievalCalibrationChannelRow,
  RetrievalCalibrationTopicRow,
  MomentCalibrationSignals,
} from "./retrieval-calibration";
export { scoreRetrievalQuality } from "./retrieval-quality";
export type {
  RetrievalQualityResult,
  RetrievalQualityTier,
  RetrievalQualityDimension,
  RetrievalQualityDimensionId,
} from "./retrieval-quality";
export {
  buildIngestionPriorityScore,
  estimateSemanticYieldFromTranscriptShape,
  scoreTopicCoverageGainText,
  transcriptLengthQualityBand,
} from "./ingestion-priority";
export type { IngestionPriorityScoreResult, IngestionPriorityBreakdownLine } from "./ingestion-priority";
export { computeResearchValueMetricsForMoments } from "./research-value-metrics";
export type { ResearchValueMetrics } from "./research-value-metrics";
