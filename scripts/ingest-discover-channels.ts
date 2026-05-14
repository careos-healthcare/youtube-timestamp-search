#!/usr/bin/env tsx

import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  discoverChannelCandidates,
  persistDiscoverySnapshot,
} from "../lib/ingestion-pipeline";
import { writeIngestionReports } from "../lib/ingestion-reports";
import { getIngestionQueuePaths } from "../lib/ingestion-queue";

function printUsage() {
  console.log(`Usage:
  npm run ingest:discover-channels -- [options]

Options:
  --limit <n>           Max catalog candidates to discover (default: 100)
  --category <name>     Filter by category (repeatable)
  --channel <slug>      Filter by channel slug (repeatable)
  --enqueue             Also verify availability and enqueue accepted rows
  --skip-verify         When used with --enqueue, skip availability preflight

Environment:
  CHECK_DELAY_MS=1500   Delay between availability checks during --enqueue
`);
}

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  const limitRaw = limitIndex !== -1 ? argv[limitIndex + 1] : "100";

  return {
    limit: Math.max(Number(limitRaw), 1),
    categories: argv
      .map((arg, index) => (arg === "--category" ? argv[index + 1] : null))
      .filter((value): value is string => Boolean(value)),
    channelSlugs: argv
      .map((arg, index) => (arg === "--channel" ? argv[index + 1] : null))
      .filter((value): value is string => Boolean(value)),
    enqueue: argv.includes("--enqueue"),
    skipVerify: argv.includes("--skip-verify"),
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

  console.log("Discovering channel/topic candidates from seed catalog...");
  const discovery = await discoverChannelCandidates({
    limit: args.limit,
    categories: args.categories,
    channelSlugs: args.channelSlugs,
    dataDir,
  });

  const paths = getIngestionQueuePaths();
  persistDiscoverySnapshot(discovery, paths);

  console.log(`Channels matched: ${discovery.channelCount}`);
  console.log(`CSV ledger exclusions: ${discovery.excludedCsvCount}`);
  console.log(`New candidates: ${discovery.candidateCount}`);
  console.log(`Discovery snapshot: ${paths.discoveryFile}`);

  if (args.enqueue) {
    const { preflightAndEnqueue } = await import("../lib/ingestion-pipeline");
    const result = await preflightAndEnqueue(discovery.candidates, {
      verify: !args.skipVerify,
      dataDir,
      source: "discover-channels",
    });
    console.log("\nEnqueue result:", result);
  }

  const reports = await writeIngestionReports();
  console.log(`\nWrote ${reports.pipelinePath}`);
  console.log(`Wrote ${reports.growthPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
