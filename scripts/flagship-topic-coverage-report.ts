#!/usr/bin/env tsx
/**
 * Flagship topic coverage governance report.
 *
 *   npm run report:flagship-topics
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildFlagshipTopicCoverageReport,
  formatFlagshipTopicCoverageMarkdown,
} from "@/lib/corpus/flagship-topics";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

async function main() {
  const moments = loadPublicMoments();
  const skipLiveSearch = process.argv.includes("--skip-search");
  const report = await buildFlagshipTopicCoverageReport(moments, {
    skipLiveSearch,
  });

  const jsonPath = join(process.cwd(), "data", "flagship-topic-coverage.json");
  const mdPath = join(process.cwd(), "FLAGSHIP_TOPIC_COVERAGE_REPORT.md");

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  writeFileSync(mdPath, formatFlagshipTopicCoverageMarkdown(report), "utf-8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(
    `Summary: ${report.summary.healthy} healthy, ${report.summary.weak} weak, ${report.summary.broken} broken`
  );
  if (report.homepageSafety.brokenCount > 0) {
    console.log(`HOMEPAGE SAFETY: ${report.homepageSafety.brokenCount} broken — ${report.homepageSafety.brokenTopics.join(", ")}`);
  }
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
