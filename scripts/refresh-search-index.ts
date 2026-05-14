#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatContentMoatReport,
  getContentMoatMetrics,
} from "../lib/content-moat";
import {
  formatHighIntentQueryReport,
  mineHighIntentQueries,
} from "../lib/query-mining";
import { getSearchLandingData } from "../lib/search-landing-engine";
import { AUTHORITY_TOPIC_SLUGS, getTopicClusterData } from "../lib/topic-cluster-engine";
import { SEARCH_QUERY_SLUGS, phraseFromSearchSlug } from "../lib/search-query-seeds";
import { listAllIndexedVideoIds } from "../lib/indexed-videos";
import { buildMomentSitemapEntries } from "../lib/moment-sitemap";
import { SITEMAP_INCLUDE_MOMENTS } from "../lib/sitemap-config";
import { TOPIC_KEYWORDS } from "../lib/topic-keywords";
import { getSiteUrl } from "../lib/seo";

async function warmPrioritySearchPages() {
  let warmed = 0;
  for (const slug of SEARCH_QUERY_SLUGS) {
    const phrase = phraseFromSearchSlug(slug);
    await getSearchLandingData(phrase, 20);
    warmed += 1;
  }
  return warmed;
}

async function warmAuthorityTopicPages() {
  let warmed = 0;
  for (const slug of AUTHORITY_TOPIC_SLUGS) {
    await getTopicClusterData(slug);
    warmed += 1;
  }
  return warmed;
}

async function estimateSitemapUrls() {
  const videoIds = await listAllIndexedVideoIds(2000);
  const momentEntries = SITEMAP_INCLUDE_MOMENTS ? await buildMomentSitemapEntries() : [];
  return (
    11 +
    SEARCH_QUERY_SLUGS.length +
    videoIds.length +
    TOPIC_KEYWORDS.length +
    momentEntries.length
  );
}

async function main() {
  console.log("Refreshing search index artifacts…");

  const [queryReport, moatMetrics, warmedSearchPages, warmedTopicPages, sitemapUrls] =
    await Promise.all([
      mineHighIntentQueries(),
      getContentMoatMetrics(),
      warmPrioritySearchPages(),
      warmAuthorityTopicPages(),
      estimateSitemapUrls(),
    ]);

  const queryReportPath = join(process.cwd(), "HIGH_INTENT_QUERY_REPORT.md");
  const moatReportPath = join(process.cwd(), "CONTENT_MOAT_REPORT.md");
  const summaryPath = join(process.cwd(), "REFRESH_INDEX_SUMMARY.md");

  writeFileSync(queryReportPath, formatHighIntentQueryReport(queryReport), "utf8");
  writeFileSync(moatReportPath, formatContentMoatReport(moatMetrics), "utf8");

  const summary = `# Refresh index summary

Generated: ${new Date().toISOString()}

| Step | Result |
|------|--------|
| Priority search pages warmed | ${warmedSearchPages} |
| Authority topic pages warmed | ${warmedTopicPages} |
| Estimated sitemap URLs | ${sitemapUrls} |
| Indexed videos | ${moatMetrics.indexedVideos} |
| Searchable segments | ${moatMetrics.searchableSegments} |
| Unique searchable phrases | ${moatMetrics.uniqueSearchablePhrases} |
| Search events (7d) | ${moatMetrics.searchGrowthLast7Days} |

Sitemap: ${getSiteUrl()}/sitemap.xml
Stats: ${getSiteUrl()}/stats

Reports updated:
- HIGH_INTENT_QUERY_REPORT.md
- CONTENT_MOAT_REPORT.md
`;

  writeFileSync(summaryPath, summary, "utf8");

  console.log(summary);
  console.log(`Wrote ${queryReportPath}`);
  console.log(`Wrote ${moatReportPath}`);
  console.log(`Wrote ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
