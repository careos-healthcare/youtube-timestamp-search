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
