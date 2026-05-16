export type {
  ResearchAnswerPublic,
  ResearchAnswerSearch,
  ResearchAnswerSlotKey,
  ResearchAnswerSlotPublic,
  ResearchAnswerSlotSearch,
  ResearchExplanationRole,
} from "./research-answer-types";
export { classifyExplanationFromText } from "./classify-explanation-role";
export type { ExplanationClassification } from "./classify-explanation-role";
export {
  evaluateSourceAuthority,
  evaluateSourceAuthorityForPublicMoment,
  SOURCE_AUTHORITY_UI_LABEL,
} from "./source-authority";
export type { SourceAuthorityInput, SourceAuthorityLabel, SourceAuthorityResult } from "./source-authority";
export {
  compareExplanationRankingKeyPublic,
  comparePublicMomentsForTopic,
  compareSearchMoments,
} from "./compare-explanations";
export type { CompareExplanationPublicRow, CompareExplanationSearchRow, CompareFraming } from "./compare-explanations";
export { buildResearchAnswerFromPublicMoments, buildResearchAnswerFromSearchMoments } from "./build-research-answer";
export {
  buildResearchSessionMetrics,
  calculateResearchDepthScore,
  classifyResearchWorkflowCohort,
  detectRepeatResearchBehavior,
  groupResearchSessionEvents,
  researchSessionIdFromRow,
  RESEARCH_SESSION_ANALYTICS_EVENTS,
} from "./research-session";
export type {
  ResearchSessionMetrics,
  ResearchSessionEventRow,
  ResearchWorkflowCohort,
} from "./research-session";
export {
  aggregateResearchSessions,
  buildResearchSessionReport,
  formatResearchSessionReportMarkdown,
  loadResearchSessionEvents,
} from "./research-session-aggregation";
export type { ResearchSessionAggregation } from "./research-session-aggregation";
