export {
  runPageGeneration,
  formatPageGenerationMarkdown,
  renderGeneratedSearchSeedsFile,
  renderGeneratedTopicSeedsFile,
  type GeneratedPageRecord,
  type PageGenerationResult,
} from "@/lib/page-generation/page-generation-report";

export { selectPageOpportunities } from "@/lib/page-generation/page-opportunity-selector";
export { slugifySearchPhrase, slugifyTopicPhrase } from "@/lib/page-generation/page-slugger";
export {
  evaluatePageQuality,
  isSpamOrNoisePhrase,
  shouldIncludeInSitemap,
  MIN_INDEXABLE_MOMENTS,
} from "@/lib/page-generation/page-quality-guard";
export { buildAutoInternalLinks, buildFaqsFromTranscriptEvidence } from "@/lib/page-generation/auto-internal-linking";
