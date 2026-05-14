#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatHighIntentQueryReport,
  mineHighIntentQueries,
} from "../lib/query-mining";

async function main() {
  const report = await mineHighIntentQueries();
  const markdown = formatHighIntentQueryReport(report);
  const outputPath = join(process.cwd(), "HIGH_INTENT_QUERY_REPORT.md");
  writeFileSync(outputPath, markdown, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(`Indexed videos scanned: ${report.indexedVideosScanned}`);
  console.log(`High-volume candidates: ${report.likelyHighVolume.length}`);
  console.log(`Long-tail candidates: ${report.lowCompetitionLongTail.length}`);
  console.log(`Zero-result queries: ${report.zeroResultSearches.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
