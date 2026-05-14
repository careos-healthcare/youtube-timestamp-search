#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  buildQueryIntelligenceReport,
  formatQueryIntelligenceMarkdown,
} from "../lib/query-intelligence/build-report";
import {
  buildQueryQualityReport,
  formatQueryQualityMarkdown,
} from "../lib/query-quality/quality-report";

async function main() {
  loadLocalEnv();
  const report = await buildQueryIntelligenceReport();
  const markdown = formatQueryIntelligenceMarkdown(report);
  const outputDir = join(process.cwd(), "data", "query-intelligence");
  mkdirSync(outputDir, { recursive: true });

  const markdownPath = join(process.cwd(), "QUERY_INTELLIGENCE_REPORT.md");
  const jsonPath = join(outputDir, "opportunities.json");

  writeFileSync(markdownPath, markdown, "utf8");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const qualityReport = buildQueryQualityReport(
    report.opportunities.map((item) => ({
      phrase: item.phrase,
      demand: item.demand,
      freshnessBoost: item.freshnessBoost,
      existingCoverage: item.existingCoverage,
    }))
  );
  const qualityMarkdownPath = join(process.cwd(), "QUERY_QUALITY_REPORT.md");
  writeFileSync(qualityMarkdownPath, formatQueryQualityMarkdown(qualityReport), "utf8");

  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${qualityMarkdownPath}`);
  console.log(`Analytics source: ${report.analyticsSource}`);
  console.log(`Opportunities ranked: ${report.opportunities.length}`);
  console.log(`Top opportunity: ${report.opportunities[0]?.phrase ?? "none"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
