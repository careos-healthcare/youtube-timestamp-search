#!/usr/bin/env tsx

import { loadLocalEnv } from "../lib/ingestion-script-env";
import { refreshIndexedCorpus } from "../lib/ingestion-pipeline";
import { writeIngestionReports } from "../lib/ingestion-reports";

function printUsage() {
  console.log(`Usage:
  npm run ingest:refresh -- [options]

Options:
  --limit <n>           Refresh up to N indexed videos (default: INGEST_REFRESH_LIMIT or 20)
  --newest-first        Refresh newest indexed videos first (default: oldest first)

Environment:
  SEED_DELAY_MS=1500
  INGEST_REFRESH_LIMIT=20
`);
}

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  return {
    limit:
      limitIndex !== -1
        ? Math.max(Number(argv[limitIndex + 1]), 1)
        : undefined,
    oldestFirst: !argv.includes("--newest-first"),
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
  console.log("Refreshing indexed transcript corpus...");

  const result = await refreshIndexedCorpus({
    limit: args.limit,
    oldestFirst: args.oldestFirst,
  });

  console.log("\nRefresh summary:", result);

  const reports = await writeIngestionReports();
  console.log(`Wrote ${reports.pipelinePath}`);
  console.log(`Wrote ${reports.growthPath}`);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
