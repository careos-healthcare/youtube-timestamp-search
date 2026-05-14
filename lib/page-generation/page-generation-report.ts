import type { SearchQuerySeed } from "@/lib/search-query-seeds";
import type { TopicSeed } from "@/lib/topic-keywords";

import {
  buildAutoInternalLinks,
  buildFaqsFromTranscriptEvidence,
  type TranscriptFaq,
} from "@/lib/page-generation/auto-internal-linking";
import {
  evaluatePageQuality,
  shouldIncludeInSitemap,
  type PageQualityResult,
} from "@/lib/page-generation/page-quality-guard";
import {
  selectPageOpportunities,
} from "@/lib/page-generation/page-opportunity-selector";
import { slugifySearchPhrase, slugifyTopicPhrase } from "@/lib/page-generation/page-slugger";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import type { TopicCluster } from "@/lib/topic-keywords";

export type GeneratedPageRecord = {
  phrase: string;
  pageType: "search" | "topic";
  slug: string;
  path: string;
  opportunityScore: number;
  momentCount: number;
  videoCount: number;
  noindex: boolean;
  sitemapEligible: boolean;
  quality: PageQualityResult;
  relatedSearches: string[];
  relatedTopics: string[];
  relatedVideos: Array<{ videoId: string; title: string; href: string }>;
  faqs: TranscriptFaq[];
  rejectionReason?: string;
};

export type PageGenerationResult = {
  generatedAt: string;
  intelligenceGeneratedAt: string;
  evaluatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  searchSeeds: SearchQuerySeed[];
  topicSeeds: TopicSeed[];
  pages: GeneratedPageRecord[];
  rejected: Array<{ phrase: string; pageType: string; reason: string }>;
};

function inferTopicCluster(label: string): TopicCluster {
  const lower = label.toLowerCase();
  if (/podcast|interview|episode/.test(lower)) return "podcasts";
  if (/startup|saas|business|marketing|sales|entrepreneur/.test(lower)) return "creator-business";
  if (/sleep|fitness|health|exercise/.test(lower)) return "health-fitness";
  if (/focus|productivity|deep work|time management/.test(lower)) return "productivity";
  if (/machine learning|ai|software|react|typescript|kubernetes|data science|web development/.test(lower)) {
    return "ai-software";
  }
  if (/invest|money|fundraising/.test(lower)) return "money-investing";
  if (/lecture|education|learning/.test(lower)) return "education-lecture";
  return "youtube-transcript-search";
}

function titleCasePhrase(phrase: string) {
  return phrase
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function runPageGeneration(limit = 40): Promise<PageGenerationResult> {
  const { snapshot, opportunities } = selectPageOpportunities(limit);
  const existingSlugs = new Set([
    ...PRIORITY_SEARCH_QUERIES.map((seed) => seed.slug),
    ...TOPIC_SEEDS.map((topic) => topic.slug),
  ]);

  const pages: GeneratedPageRecord[] = [];
  const rejected: PageGenerationResult["rejected"] = [];
  const searchSeeds: SearchQuerySeed[] = [];
  const topicSeeds: TopicSeed[] = [];

  for (const opportunity of opportunities) {
    const searchPhrase =
      opportunity.pageType === "topic"
        ? opportunity.clusterLabel ?? opportunity.phrase
        : opportunity.phrase;

    const landing = await getSearchLandingData(searchPhrase, 20);
    const quality = evaluatePageQuality({
      phrase: opportunity.phrase,
      pageType: opportunity.pageType,
      momentCount: landing.moments.length,
      videoCount: landing.videoCount,
      opportunityScore: opportunity.opportunityScore,
      existingSlugs,
    });

    const links = buildAutoInternalLinks({
      phrase: searchPhrase,
      topVideos: landing.topVideos,
    });
    const faqs = buildFaqsFromTranscriptEvidence(searchPhrase, landing.moments);

    const slug =
      opportunity.pageType === "search"
        ? slugifySearchPhrase(opportunity.phrase)
        : slugifyTopicPhrase(opportunity.phrase);

    const record: GeneratedPageRecord = {
      phrase: opportunity.phrase,
      pageType: opportunity.pageType,
      slug,
      path: quality.canonicalPath,
      opportunityScore: opportunity.opportunityScore,
      momentCount: landing.moments.length,
      videoCount: landing.videoCount,
      noindex: quality.noindex,
      sitemapEligible: shouldIncludeInSitemap(quality),
      quality,
      relatedSearches: links.relatedSearchPhrases,
      relatedTopics: links.relatedTopicSlugs.map((topic) => topic.slug),
      relatedVideos: links.relatedVideos,
      faqs,
      rejectionReason: quality.rejectionReason,
    };

    if (!quality.accepted) {
      rejected.push({
        phrase: opportunity.phrase,
        pageType: opportunity.pageType,
        reason: quality.rejectionReason ?? "Rejected by quality guard",
      });
      continue;
    }

    existingSlugs.add(slug);
    pages.push(record);

    if (opportunity.pageType === "search") {
      searchSeeds.push({
        slug,
        phrase: opportunity.phrase,
        title: `${titleCasePhrase(opportunity.phrase)} — video moments`,
        description: `${landing.moments.length} indexed moments across ${landing.videoCount} videos for "${opportunity.phrase}".`,
      });
    } else {
      topicSeeds.push({
        slug,
        displayName: titleCasePhrase(opportunity.phrase),
        cluster: inferTopicCluster(opportunity.phrase),
        description: `Search YouTube transcripts for ${opportunity.phrase.toLowerCase()} moments, clips, and timestamped quotes.`,
        featured: false,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    intelligenceGeneratedAt: snapshot.generatedAt,
    evaluatedCount: opportunities.length,
    acceptedCount: pages.length,
    rejectedCount: rejected.length,
    searchSeeds,
    topicSeeds,
    pages,
    rejected,
  };
}

export function formatPageGenerationMarkdown(result: PageGenerationResult) {
  const acceptedRows = result.pages
    .map(
      (page, index) =>
        `| ${index + 1} | ${page.pageType} | ${page.phrase.replace(/\|/g, "\\|")} | ${page.path} | ${page.momentCount} | ${page.videoCount} | ${page.sitemapEligible ? "yes" : "no"} | ${page.opportunityScore.toFixed(1)} |`
    )
    .join("\n");

  const rejectedRows = result.rejected
    .slice(0, 30)
    .map(
      (item, index) =>
        `| ${index + 1} | ${item.pageType} | ${item.phrase.replace(/\|/g, "\\|")} | ${item.reason.replace(/\|/g, "\\|")} |`
    )
    .join("\n");

  return `# Auto Page Generation Report

Generated: ${result.generatedAt}
Query intelligence snapshot: ${result.intelligenceGeneratedAt}
Evaluated: ${result.evaluatedCount}
Accepted: ${result.acceptedCount}
Rejected: ${result.rejectedCount}

## Accepted pages

| Rank | Type | Phrase | Path | Moments | Videos | Sitemap | Opportunity |
|------|------|--------|------|--------:|-------:|:-------:|------------:|
${acceptedRows || "| — | — | — | — | — | — | — | — |"}

## Rejected candidates

| Rank | Type | Phrase | Reason |
|------|------|--------|--------|
${rejectedRows || "| — | — | — | — |"}

## Quality guards applied

- Minimum ${3} moments for indexable pages
- Spam / corpus-noise rejection
- Canonical slug normalization
- Duplicate-intent suppression
- noindex for thin low-confidence pages

## Regenerate

\`\`\`bash
npm run queries:intelligence
npm run pages:generate
npm run pages:validate
\`\`\`

Machine-readable output: \`data/page-generation/generated-pages.json\`
Generated seeds: \`lib/generated-search-query-seeds.ts\`, \`lib/generated-topic-seeds.ts\`
`;
}

export function renderGeneratedSearchSeedsFile(seeds: SearchQuerySeed[]) {
  const body = seeds
    .map(
      (seed) =>
        `  { slug: ${JSON.stringify(seed.slug)}, phrase: ${JSON.stringify(seed.phrase)}, title: ${JSON.stringify(seed.title)}, description: ${JSON.stringify(seed.description)} },`
    )
    .join("\n");

  return `/** Auto-generated by npm run pages:generate — do not edit manually. */
import type { SearchQuerySeed } from "@/lib/search-query-seeds";

export const GENERATED_SEARCH_QUERY_SEEDS: SearchQuerySeed[] = [
${body}
];
`;
}

export function renderGeneratedTopicSeedsFile(seeds: TopicSeed[]) {
  const body = seeds
    .map(
      (seed) =>
        `  { slug: ${JSON.stringify(seed.slug)}, displayName: ${JSON.stringify(seed.displayName)}, cluster: ${JSON.stringify(seed.cluster)}, description: ${JSON.stringify(seed.description)}, featured: ${seed.featured ?? false} },`
    )
    .join("\n");

  return `/** Auto-generated by npm run pages:generate — do not edit manually. */
import type { TopicSeed } from "@/lib/topic-keywords";

export const GENERATED_TOPIC_SEEDS: TopicSeed[] = [
${body}
];
`;
}
