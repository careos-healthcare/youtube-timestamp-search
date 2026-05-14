export {
  buildQueryIntelligenceReport,
  formatQueryIntelligenceMarkdown,
  loadHighIntentReportFallbackPhrases,
  type QueryIntelligenceReport,
  type QuerySignalRecord,
} from "@/lib/query-intelligence/build-report";

export { normalizeQueryPhrase, tokenizeQuery, isUsefulQueryPhrase } from "@/lib/query-intelligence/query-normalizer";
export { classifyQueryIntent, commercialIntentScore } from "@/lib/query-intelligence/intent-classifier";
export { clusterQueries } from "@/lib/query-intelligence/query-clustering";
export { scoreOpportunity, rankOpportunities } from "@/lib/query-intelligence/opportunity-scoring";
