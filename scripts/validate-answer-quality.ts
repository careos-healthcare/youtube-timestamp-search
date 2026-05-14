#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  buildAnswerQualityReport,
  formatAnswerQualityMarkdown,
} from "../lib/reports/answer-quality-report";
import {
  buildSearchSatisfactionReport,
  formatSearchSatisfactionMarkdown,
} from "../lib/reports/search-satisfaction-report";

async function main() {
  loadLocalEnv();

  const [answerReport, satisfactionReport] = await Promise.all([
    buildAnswerQualityReport(),
    buildSearchSatisfactionReport(),
  ]);

  const answerMarkdownPath = join(process.cwd(), "ANSWER_QUALITY_REPORT.md");
  const satisfactionMarkdownPath = join(process.cwd(), "SEARCH_SATISFACTION_REPORT.md");

  writeFileSync(answerMarkdownPath, formatAnswerQualityMarkdown(answerReport), "utf8");
  writeFileSync(satisfactionMarkdownPath, formatSearchSatisfactionMarkdown(satisfactionReport), "utf8");

  console.log("answer-quality validation passed");
  console.log(`Wrote ${answerMarkdownPath}`);
  console.log(`Wrote ${satisfactionMarkdownPath}`);
  console.log(`Answer coverage: ${answerReport.answerCoveragePercent}%`);
  console.log(`Satisfaction score: ${satisfactionReport.satisfaction.score}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
