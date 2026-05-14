#!/usr/bin/env tsx

import { loadLocalEnv } from "../lib/ingestion-script-env";
import { runIngestionWorker } from "../lib/ingestion-pipeline";
import { writeIngestionReports } from "../lib/ingestion-reports";

function printUsage() {
  console.log(`Usage:
  npm run ingest:worker -- [options]

Options:
  --limit <n>           Process up to N pending jobs (default: INGEST_WORKER_BATCH or 10)

Environment:
  SEED_DELAY_MS=1500
  INGEST_WORKER_BATCH=10
`);
}

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  return {
    limit:
      limitIndex !== -1
        ? Math.max(Number(argv[limitIndex + 1]), 1)
        : undefined,
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
  console.log("Running ingestion worker...");

  const result = await runIngestionWorker({ limit: args.limit });
  console.log("\nWorker summary:", result);

  const reports = await writeIngestionReports();
  console.log(`Wrote ${reports.pipelinePath}`);
  console.log(`Wrote ${reports.growthPath}`);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
