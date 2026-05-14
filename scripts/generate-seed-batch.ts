#!/usr/bin/env node
import { resolve } from "node:path";

import {
  formatAvailabilitySummary,
} from "../lib/transcript-availability-check";
import {
  buildSeedBatchPaths,
  formatGenerateBatchSummary,
  generateSeedBatchCandidates,
  generateVerifiedSeedBatch,
  writeRawSeedBatchCsv,
} from "../lib/seed-batch-generator";
import { SEED_CHANNEL_CATALOG, SEED_CHANNEL_CATEGORIES } from "../lib/seed-channel-catalog";

function printUsage() {
  console.log(`Usage:
  npm run generate:seed-batch -- --batch 003 --limit 100 [options]

Options:
  --batch <id>              Batch id for output filenames (required)
  --limit <n>               Max candidate rows to generate (default: 100)
  --category <name>         Filter catalog channels by category (repeatable)
  --channel <slug>          Filter catalog channels by slug (repeatable)
  --skip-verify             Write raw CSV only; do not run availability checks
  --list-channels           Print catalog channels and exit

Environment:
  CHECK_DELAY_MS=1500       Delay between availability checks (default: 1500)

Workflow:
  1. Generate raw candidates from lib/seed-channel-catalog.ts
  2. Verify transcript availability (default)
  3. Seed only the .available.csv output

Never seed raw CSV files directly.
`);
}

function parseArgs(argv: string[]) {
  const batchIndex = argv.findIndex((arg) => arg === "--batch");
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  const batchId = batchIndex !== -1 ? argv[batchIndex + 1] : undefined;
  const limitRaw = limitIndex !== -1 ? argv[limitIndex + 1] : "100";
  const limit = Math.max(Number(limitRaw), 1);

  const categories = argv
    .map((arg, index) => (arg === "--category" ? argv[index + 1] : null))
    .filter((value): value is string => Boolean(value));

  const channelSlugs = argv
    .map((arg, index) => (arg === "--channel" ? argv[index + 1] : null))
    .filter((value): value is string => Boolean(value));

  return {
    batchId,
    limit: Number.isFinite(limit) ? limit : 100,
    categories,
    channelSlugs,
    skipVerify: argv.includes("--skip-verify"),
    listChannels: argv.includes("--list-channels"),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const args = parseArgs(argv);

  if (args.listChannels) {
    for (const channel of SEED_CHANNEL_CATALOG) {
      console.log(
        `${channel.slug} | ${channel.category} | ${channel.name} | ${channel.videos.length} videos`
      );
    }
    console.log(`\nCategories: ${SEED_CHANNEL_CATEGORIES.join(", ")}`);
    process.exit(0);
  }

  if (!args.batchId) {
    console.error("Missing required --batch <id>");
    printUsage();
    process.exit(1);
  }

  const dataDir = resolve(process.cwd(), "data");
  const delayMs = Number(process.env.CHECK_DELAY_MS ?? 1500);

  if (args.skipVerify) {
    const { candidates, excludedCount, channelCount } = generateSeedBatchCandidates({
      limit: args.limit,
      categories: args.categories,
      channelSlugs: args.channelSlugs,
      dataDir,
    });

    const { rawPath } = buildSeedBatchPaths(dataDir, args.batchId);
    writeRawSeedBatchCsv(rawPath, candidates);

    console.log(`Catalog channels matched: ${channelCount}`);
    console.log(`Excluded existing video ids: ${excludedCount}`);
    console.log(`Wrote ${candidates.length} raw candidate(s) to ${rawPath}`);
    console.log(`\nNext: npm run check:transcripts -- ${rawPath}`);
    process.exit(0);
  }

  console.log(`Generating batch ${args.batchId} with up to ${args.limit} catalog candidate(s)...`);
  console.log(`Rate limit delay: ${delayMs}ms between availability checks\n`);

  const result = await generateVerifiedSeedBatch({
    batchId: args.batchId,
    limit: args.limit,
    categories: args.categories,
    channelSlugs: args.channelSlugs,
    dataDir,
    verify: true,
    delayMs: Number.isFinite(delayMs) ? delayMs : 1500,
  });

  console.log(`\n${formatGenerateBatchSummary(result)}`);

  if (result.verified && result.unavailableCount != null) {
    console.log(`\n${formatAvailabilitySummary({
      total: result.candidateCount,
      available: result.availableCount ?? 0,
      unavailable: result.unavailableCount ?? 0,
      results: [],
    })}`);
  }

  process.exit(result.verified && (result.unavailableCount ?? 0) > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
