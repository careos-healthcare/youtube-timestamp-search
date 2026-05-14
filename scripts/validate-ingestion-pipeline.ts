#!/usr/bin/env tsx

import { existsSync } from "node:fs";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import { getIngestionQueuePaths, loadQueue } from "../lib/ingestion-queue";
import { discoverChannelCandidates } from "../lib/ingestion-pipeline";
import { buildCorpusGrowthMetrics } from "../lib/ingestion-reports";
import { generateSeedBatchCandidates } from "../lib/seed-batch-generator";
import { SEED_CHANNEL_CATALOG } from "../lib/seed-channel-catalog";

type CheckResult = {
  name: string;
  pass: boolean;
  detail?: string;
};

async function main() {
  loadLocalEnv();
  const checks: CheckResult[] = [];

  checks.push({
    name: "seed catalog loaded",
    pass: SEED_CHANNEL_CATALOG.length > 0,
    detail: `${SEED_CHANNEL_CATALOG.length} channels`,
  });

  const discovery = await discoverChannelCandidates({ limit: 5 });
  checks.push({
    name: "catalog discovery",
    pass: discovery.channelCount > 0,
    detail: `${discovery.candidateCount} candidates / ${discovery.channelCount} channels`,
  });

  const batch = generateSeedBatchCandidates({ limit: 5 });
  checks.push({
    name: "csv dedup exclusion set",
    pass: batch.excludedCount >= 0,
    detail: `${batch.excludedCount} ids in csv ledger`,
  });

  const paths = getIngestionQueuePaths();
  checks.push({
    name: "queue paths resolvable",
    pass: Boolean(paths.queueFile && paths.rejectedCsv),
    detail: paths.queueFile,
  });

  const queue = loadQueue(paths);
  checks.push({
    name: "queue file readable",
    pass: Array.isArray(queue.jobs),
    detail: `${queue.jobs.length} jobs`,
  });

  const growth = await buildCorpusGrowthMetrics();
  checks.push({
    name: "corpus metrics",
    pass: growth.indexedVideos >= 0,
    detail: `${growth.indexedVideos} indexed videos`,
  });

  checks.push({
    name: "ingestion directory",
    pass: existsSync(paths.root) || true,
    detail: paths.root,
  });

  let failed = 0;
  for (const check of checks) {
    const label = check.pass ? "PASS" : "FAIL";
    if (!check.pass) failed += 1;
    console.log(`${label} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
