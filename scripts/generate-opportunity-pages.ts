#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  formatPageGenerationMarkdown,
  renderGeneratedSearchSeedsFile,
  renderGeneratedTopicSeedsFile,
  runPageGeneration,
} from "../lib/page-generation/page-generation-report";

async function main() {
  loadLocalEnv();
  const limit = Number(process.env.PAGE_GENERATION_LIMIT ?? "40");
  const result = await runPageGeneration(limit);

  const outputDir = join(process.cwd(), "data", "page-generation");
  mkdirSync(outputDir, { recursive: true });

  const markdownPath = join(process.cwd(), "AUTO_PAGE_GENERATION_REPORT.md");
  const jsonPath = join(outputDir, "generated-pages.json");
  const searchSeedsPath = join(process.cwd(), "lib", "generated-search-query-seeds.ts");
  const topicSeedsPath = join(process.cwd(), "lib", "generated-topic-seeds.ts");

  writeFileSync(markdownPath, formatPageGenerationMarkdown(result), "utf8");
  writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf8");
  writeFileSync(searchSeedsPath, renderGeneratedSearchSeedsFile(result.searchSeeds), "utf8");
  writeFileSync(topicSeedsPath, renderGeneratedTopicSeedsFile(result.topicSeeds), "utf8");

  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Accepted pages: ${result.acceptedCount}`);
  console.log(`Rejected candidates: ${result.rejectedCount}`);
  console.log(`Generated search seeds: ${result.searchSeeds.length}`);
  console.log(`Generated topic seeds: ${result.topicSeeds.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
