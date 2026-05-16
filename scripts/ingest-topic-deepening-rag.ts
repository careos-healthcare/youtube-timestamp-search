#!/usr/bin/env tsx
/**
 * Topic-deepening controlled ingest for RAG (queue-driven, not global wave).
 *
 *   npm run ingest:topic-deepening-rag -- --dry-run
 *   npm run ingest:topic-deepening-rag -- --write-queue --ingest --materialize --refresh-reports
 *   npm run ingest:topic-deepening-rag -- --refresh-outcome
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  formatRagIngestMarkdown,
  refreshRagIngestOutcome,
  runRagTopicDeepeningIngest,
} from "@/lib/graph/topic-deepening-ingest";
import { resetPublicMomentsCache } from "@/lib/moments/load-public-moments";

function printUsage() {
  console.log(`Usage:
  npm run ingest:topic-deepening-rag -- [flags]

Flags:
  --dry-run              Simulate transcript checks only (no queue writes)
  --report-only          Alias for dry-run outcome artifact
  --skip-verify          Skip YouTube transcript availability checks
  --write-queue          Enqueue RAG batch to data/ingestion/queue.json
  --ingest               Run worker for approved video IDs (requires --write-queue)
  --materialize          Run materialize:public-moments after successful ingest
  --refresh-reports      Regenerate research-graph / topic-deepening / research-grade reports
  --refresh-outcome      Write outcome report from current corpus only (no transcript checks)

Rules:
  Only videos from data/topic-deepening-queue.json row for "rag".
  Does not process non-RAG pending jobs when using --ingest.
`);
}

function writeOutcome(outcome: Awaited<ReturnType<typeof runRagTopicDeepeningIngest>>) {
  const jsonPath = join(process.cwd(), "data", "topic-deepening-rag-ingest-result.json");
  const mdPath = join(process.cwd(), "TOPIC_DEEPENING_RAG_INGEST_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(outcome, null, 2), "utf-8");
  writeFileSync(mdPath, formatRagIngestMarkdown(outcome), "utf-8");
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const dryRun = argv.includes("--dry-run") || argv.includes("--report-only");
  const reportOnly = argv.includes("--report-only");
  const skipVerify = argv.includes("--skip-verify");
  const writeQueue = argv.includes("--write-queue");
  const ingest = argv.includes("--ingest");
  const materialize = argv.includes("--materialize");
  const refreshReports = argv.includes("--refresh-reports");
  const refreshOutcome = argv.includes("--refresh-outcome");

  if (ingest && !writeQueue) {
    console.error("--ingest requires --write-queue in the same command.");
    process.exit(1);
  }

  if (refreshOutcome) {
    const outcome = refreshRagIngestOutcome();
    writeOutcome(outcome);
    console.log(`Showcase-ready: ${outcome.readyToShowcase}`);
    console.log(
      `RAG tier: ${outcome.researchGradeAfter?.tier ?? "—"}; moments: ${outcome.researchGradeAfter?.momentCount ?? "—"}`
    );
    return;
  }

  const outcome = await runRagTopicDeepeningIngest({
    dryRun,
    reportOnly,
    skipVerify,
    writeQueue,
    ingest,
  });

  writeOutcome(outcome);
  console.log(`Candidates: ${outcome.plan.candidates.map((c) => c.id).join(", ")}`);
  console.log(
    `Ingestion: eligible=${outcome.ingestion.summary.eligible} queued=${outcome.ingestion.summary.queued} already=${outcome.ingestion.summary.alreadyIndexed} in_queue=${outcome.ingestion.summary.inSeedQueue}`
  );
  if (outcome.worker) {
    console.log(`Worker: indexed=${outcome.worker.indexed} failed=${outcome.worker.failed}`);
  }

  if (materialize && outcome.worker && outcome.worker.indexed > 0) {
    console.log("Materializing public moments…");
    const videoEnv = outcome.plan.videoIds.join(",");
    execSync("npm run materialize:public-moments", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: {
        ...process.env,
        PUBLIC_MOMENTS_PRIORITIZE_VIDEO_IDS: videoEnv,
        PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP: "80",
        PUBLIC_MOMENTS_MAX_TOTAL: "260",
      },
    });
    resetPublicMomentsCache();
  }

  if (refreshReports && outcome.worker && outcome.worker.indexed > 0) {
    console.log("Refreshing governance reports…");
    for (const script of [
      "report:research-graph",
      "report:research-grade-topics",
      "report:topic-deepening",
    ]) {
      execSync(`npm run ${script}`, { stdio: "inherit", cwd: process.cwd() });
    }
    const refreshed = refreshRagIngestOutcome();
    writeOutcome(refreshed);
    console.log(`Showcase-ready: ${refreshed.readyToShowcase}`);
  }

  if (outcome.ingestion.stopReason) {
    console.error(`Stop: ${outcome.ingestion.stopReason}`);
    process.exit(1);
  }
  if (outcome.worker && outcome.worker.failed > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
