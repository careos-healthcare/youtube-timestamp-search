#!/usr/bin/env tsx
/**
 * Research-grade topic governance report (high-signal corpus program).
 *
 *   npm run report:research-grade-topics
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildResearchGradeTopicReport,
  formatResearchGradeTopicMarkdown,
} from "@/lib/corpus/topic-research-grade";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

function main() {
  const moments = loadPublicMoments();
  const report = buildResearchGradeTopicReport(moments);

  const jsonPath = join(process.cwd(), "data", "research-grade-topic-report.json");
  const mdPath = join(process.cwd(), "RESEARCH_GRADE_TOPIC_REPORT.md");

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  writeFileSync(mdPath, formatResearchGradeTopicMarkdown(report), "utf-8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(
    `Tiers: elite=${report.summary.elite} strong=${report.summary.strong} weak=${report.summary.weak} broken=${report.summary.broken}`
  );
  console.log(`Moat candidates: ${report.researchMoatCandidates.length}`);
  console.log(`Trust drift signals: ${report.topicTrustDrift.length}`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
