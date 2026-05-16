#!/usr/bin/env tsx
/**
 * Generic topic-deepening controlled ingest (queue-driven).
 *
 *   npm run ingest:topic-deepening -- --topic=statistics-for-ml --dry-run
 *   npm run ingest:topic-deepening -- --topic=statistics-for-ml --write-queue --ingest --materialize --refresh-reports
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { execSync } from "node:child_process";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  refreshTopicDeepeningIngestOutcome,
  runTopicDeepeningIngest,
  writeTopicDeepeningIngestArtifacts,
} from "@/lib/graph/topic-deepening-ingest";
import { resetPublicMomentsCache } from "@/lib/moments/load-public-moments";

function parseFlag(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=")[1];
  const i = argv.indexOf(name);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("-")) return argv[i + 1];
  return undefined;
}

function parseNumFlag(argv: string[], name: string, def: number): number {
  const raw = parseFlag(argv, name);
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : def;
}

function printUsage() {
  console.log(`Usage:
  npm run ingest:topic-deepening -- --topic=<slug> [flags]

Flags:
  --topic=<slug>         Required (e.g. statistics-for-ml, fine-tuning)
  --dry-run              Default: transcript checks only, no writes
  --write-queue          Enqueue approved videos to data/ingestion/queue.json
  --ingest               Run worker (requires --write-queue)
  --materialize          materialize:public-moments after successful ingest
  --refresh-reports      Regenerate governance + retrieval reports
  --refresh-outcome      Snapshot outcome from current corpus only
  --force                Allow ingest when topic is ready_to_showcase
  --skip-verify          Skip transcript availability checks
  --limit=N              Max wave candidates to evaluate (default 3)
  --max-live=N           Max videos to queue/ingest (default 3)

Rules:
  Topic must appear in data/topic-deepening-queue.json (queue or analyses).
  Refuses ready_to_showcase unless --force.
`);
}

const GOVERNANCE_REPORTS = [
  "report:research-graph",
  "report:research-grade-topics",
  "report:flagship-topics",
  "report:topic-deepening",
  "report:retrieval-calibration",
  "report:retrieval-quality",
] as const;

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const topic = parseFlag(argv, "--topic");
  if (!topic) {
    console.error("--topic=<slug> is required");
    printUsage();
    process.exit(1);
  }

  const dryRunExplicit = argv.includes("--dry-run");
  const writeQueue = argv.includes("--write-queue");
  const ingest = argv.includes("--ingest");
  const dryRun = dryRunExplicit || (!writeQueue && !argv.includes("--refresh-outcome"));
  const reportOnly = argv.includes("--report-only");
  const skipVerify = argv.includes("--skip-verify");
  const materialize = argv.includes("--materialize");
  const refreshReports = argv.includes("--refresh-reports");
  const refreshOutcome = argv.includes("--refresh-outcome");
  const force = argv.includes("--force");
  const maxCandidates = parseNumFlag(argv, "--limit", 3);
  const maxLive = parseNumFlag(argv, "--max-live", 3);

  if (ingest && !writeQueue) {
    console.error("--ingest requires --write-queue");
    process.exit(1);
  }

  if (refreshOutcome) {
    const outcome = refreshTopicDeepeningIngestOutcome(topic);
    writeTopicDeepeningIngestArtifacts(outcome);
    console.log(`Showcase-ready: ${outcome.readyToShowcase}; elite: ${outcome.becameElite}`);
    return;
  }

  const outcome = await runTopicDeepeningIngest(topic, {
    dryRun: dryRun || reportOnly,
    reportOnly,
    skipVerify,
    writeQueue,
    ingest,
    force,
    maxCandidates,
    maxLive,
  });

  writeTopicDeepeningIngestArtifacts(outcome);
  console.log(`Topic: ${outcome.topicSlug}`);
  console.log(`Candidates: ${outcome.plan.candidates.map((c) => c.id).join(", ")}`);
  console.log(
    `Ingestion: eligible=${outcome.ingestion.summary.eligible} queued=${outcome.ingestion.summary.queued} gate=${outcome.ingestion.transcriptGate.passed}`
  );
  if (outcome.worker) {
    console.log(`Worker: indexed=${outcome.worker.indexed} failed=${outcome.worker.failed}`);
  }

  if (materialize && outcome.worker && outcome.worker.indexed > 0) {
    const videoEnv = outcome.plan.videoIds.slice(0, maxLive).join(",");
    execSync("npm run materialize:public-moments", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: {
        ...process.env,
        PUBLIC_MOMENTS_PRIORITIZE_VIDEO_IDS: videoEnv,
        PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP: "80",
        PUBLIC_MOMENTS_MAX_TOTAL: "280",
      },
    });
    resetPublicMomentsCache();
  }

  if (refreshReports && outcome.worker && outcome.worker.indexed > 0) {
    for (const script of GOVERNANCE_REPORTS) {
      execSync(`npm run ${script}`, { stdio: "inherit", cwd: process.cwd() });
    }
    const refreshed = refreshTopicDeepeningIngestOutcome(topic);
    writeTopicDeepeningIngestArtifacts(refreshed);
    console.log(`After reports — showcase: ${refreshed.readyToShowcase}; elite: ${refreshed.becameElite}`);
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
