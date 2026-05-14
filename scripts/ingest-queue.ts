#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import { enqueueCandidates } from "../lib/ingestion-queue";
import { preflightAndEnqueue } from "../lib/ingestion-pipeline";
import { writeIngestionReports } from "../lib/ingestion-reports";
import { generateSeedBatchCandidates } from "../lib/seed-batch-generator";
import { parseSeedCsv } from "../lib/seed-transcript-ingestion";

function printUsage() {
  console.log(`Usage:
  npm run ingest:queue -- [options]

Options:
  --limit <n>           Pull up to N catalog candidates (default: 50)
  --category <name>     Filter catalog by category (repeatable)
  --channel <slug>      Filter catalog by channel slug (repeatable)
  --from-csv <path>     Enqueue rows from an existing CSV instead of catalog
  --verify              Run transcript availability preflight (default)
  --skip-verify         Skip availability preflight

Environment:
  CHECK_DELAY_MS=1500
`);
}

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  const csvIndex = argv.findIndex((arg) => arg === "--from-csv");

  return {
    limit: Math.max(Number(limitIndex !== -1 ? argv[limitIndex + 1] : 50), 1),
    csvPath: csvIndex !== -1 ? argv[csvIndex + 1] : undefined,
    categories: argv
      .map((arg, index) => (arg === "--category" ? argv[index + 1] : null))
      .filter((value): value is string => Boolean(value)),
    channelSlugs: argv
      .map((arg, index) => (arg === "--channel" ? argv[index + 1] : null))
      .filter((value): value is string => Boolean(value)),
    verify: !argv.includes("--skip-verify"),
  };
}

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const dataDir = join(process.cwd(), "data");
  let candidates;

  if (args.csvPath) {
    const absolute = resolve(args.csvPath);
    const parsed = parseSeedCsv(readFileSync(absolute, "utf8"));
    if (parsed.errors.length > 0) {
      console.error("CSV validation failed");
      process.exit(1);
    }
    candidates = parsed.rows;
  } else {
    ({ candidates } = generateSeedBatchCandidates({
      limit: args.limit,
      categories: args.categories,
      channelSlugs: args.channelSlugs,
      dataDir,
    }));
  }

  console.log(`Queueing ${candidates.length} candidate(s)...`);

  const result = args.verify
    ? await preflightAndEnqueue(candidates, {
        verify: true,
        dataDir,
        source: args.csvPath ? "csv-queue" : "catalog-queue",
      })
    : await enqueueCandidates(candidates, {
        source: args.csvPath ? "csv-queue" : "catalog-queue",
        dataDir,
      });

  console.log("Queue result:", result);

  const reports = await writeIngestionReports();
  console.log(`Wrote ${reports.pipelinePath}`);
  console.log(`Wrote ${reports.growthPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
