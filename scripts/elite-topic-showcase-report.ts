#!/usr/bin/env tsx
/**
 * Elite topic showcase validation report (RAG + statistics-for-ML).
 *
 *   npm run report:elite-showcase
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildEliteTopicShowcaseReport,
  formatEliteTopicShowcaseMarkdown,
} from "@/lib/graph/elite-topic-showcase";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

function main() {
  const moments = loadPublicMoments();
  const report = buildEliteTopicShowcaseReport(moments);

  const jsonPath = join(process.cwd(), "data", "elite-topic-showcase.json");
  const mdPath = join(process.cwd(), "ELITE_TOPIC_SHOWCASE_REPORT.md");

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  writeFileSync(mdPath, formatEliteTopicShowcaseMarkdown(report), "utf-8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  for (const t of report.topics) {
    console.log(
      `${t.canonicalSlug}: grade=${t.researchGrade.tier} graph=${t.graphPlanner.status} moments=${t.researchGrade.momentCount} collection=${t.collection.kind}`
    );
  }
  if (report.pageRepresentationGaps.length) {
    console.log(`Page/collection gaps: ${report.pageRepresentationGaps.length}`);
  }
}

main();
