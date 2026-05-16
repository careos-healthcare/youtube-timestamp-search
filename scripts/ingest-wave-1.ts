#!/usr/bin/env tsx
/**
 * Controlled Wave 1 ingestion (dry-run, queue, optional small live worker).
 *
 * Defaults: simulate only (no queue writes, no worker) — use --write-queue / --ingest to mutate.
 *
 *   npm run ingest:wave-1 -- --dry-run --limit=10
 *   npm run ingest:wave-1 -- --write-queue --limit=5
 *   npm run ingest:wave-1 -- --write-queue --ingest --limit=3   # queue + max 3 worker jobs
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  runWave1IngestionWithCandidates,
  snapshotCorpusQuality,
  writeWave1MarkdownReport,
  type Wave1IngestionRunResult,
} from "@/lib/ingestion-wave-1-runner";
import { loadPublicMoments, resetPublicMomentsCache } from "@/lib/moments/load-public-moments";
import { validateWave1CandidatesFile, Wave1ValidationError } from "@/lib/ingestion-wave-1-validate";

function parseNumFlag(argv: string[], flag: string, def: number): number {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) {
    const n = Number(eq.split("=")[1]);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : def;
  }
  const i = argv.indexOf(flag);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("-")) {
    const n = Number(argv[i + 1]);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : def;
  }
  return def;
}

function hasExplicitLimit(argv: string[]) {
  return argv.some((a) => a === "--limit" || a.startsWith("--limit="));
}

function printUsage() {
  console.log(`Usage:
  npm run ingest:wave-1 -- [flags]

Flags:
  --dry-run           Force simulation (no queue / no worker) even with --write-queue
  --report-only       Same as dry-run (reports only)
  --skip-verify       Skip YouTube transcript availability checks (faster, riskier)
  --write-queue       Enqueue eligible seeds to data/ingestion/queue.json (source: wave-1)
  --ingest            Run ingestion worker (max 3 jobs per invocation; rate limits via SEED_DELAY_MS)
  --limit=N         Window size / batch cap (default: 10 simulate, 5 when writing/ingesting)
  --start=N         Offset into Wave 1 candidate list

Rules:
  Without --write-queue, only dry classification + optional transcript checks run.
  --ingest must be paired with --write-queue (same command). Otherwise use: npm run ingest:worker -- --limit 3
  Transcript gate aborts writes if ≥3 checks and >50% unavailable in the verified slice.
  Live worker never processes more than 3 jobs per run when using --ingest (capped).
`);
}

function writeExecutionReport(
  dryPath: string,
  resultPath: string,
  outPath: string
) {
  const parts: string[] = [];
  parts.push("# Wave 1 ingestion — execution report");
  parts.push("");
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push("");
  parts.push("## Dry-run artifact");
  parts.push("");
  parts.push(`See \`${dryPath}\` and \`${resultPath}\` for the latest machine-readable summary.`);
  parts.push("");
  if (existsSync(dryPath)) {
    parts.push("### Dry-run excerpt (head)");
    parts.push("");
    parts.push("```");
    parts.push(readFileSync(dryPath, "utf-8").split("\n").slice(0, 40).join("\n"));
    parts.push("```");
    parts.push("");
  }
  if (existsSync(resultPath)) {
    const j = JSON.parse(readFileSync(resultPath, "utf-8")) as {
      enqueue?: unknown;
      worker?: unknown;
      proceedToRemaining31?: boolean;
      stopReason?: string;
      corpusMetricsBefore?: unknown;
      corpusMetricsAfter?: unknown;
    };
    parts.push("## Queue / worker");
    parts.push("");
    parts.push("```json");
    parts.push(JSON.stringify({ enqueue: j.enqueue, worker: j.worker }, null, 2));
    parts.push("```");
    parts.push("");
    parts.push("## Corpus quality delta");
    parts.push("");
    parts.push("```json");
    parts.push(JSON.stringify({ before: j.corpusMetricsBefore, after: j.corpusMetricsAfter }, null, 2));
    parts.push("```");
    parts.push("");
    parts.push("## Proceed to remaining 31?");
    parts.push("");
    parts.push(String(j.proceedToRemaining31 ?? "unknown"));
    parts.push("");
    if (j.stopReason) {
      parts.push("## Stop / caution");
      parts.push("");
      parts.push(j.stopReason);
      parts.push("");
    }
  }
  writeFileSync(outPath, parts.join("\n"), "utf-8");
}

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const dryRun = argv.includes("--dry-run");
  const reportOnly = argv.includes("--report-only");
  const skipVerify = argv.includes("--skip-verify");
  const writeQueue = argv.includes("--write-queue");
  const ingest = argv.includes("--ingest");

  if (ingest && !writeQueue) {
    console.error(
      "Wave 1: --ingest must be used with --write-queue in the same command. To process an existing queue, run: npm run ingest:worker -- --limit 3"
    );
    process.exit(1);
  }

  const explicitLimit = hasExplicitLimit(argv);
  const defaultLimit = writeQueue || ingest ? 5 : 10;
  const rawLimit = parseNumFlag(argv, "--limit", defaultLimit);
  const maxWindow = (writeQueue || ingest) && !explicitLimit ? 5 : 50;
  const limit = Math.min(Math.max(rawLimit || 1, 1), maxWindow);
  const start = parseNumFlag(argv, "--start", 0);

  let candidates;
  try {
    candidates = await validateWave1CandidatesFile();
  } catch (e) {
    if (e instanceof Wave1ValidationError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }

  const result = await runWave1IngestionWithCandidates(candidates, {
    dryRun,
    reportOnly,
    skipVerify,
    writeQueue,
    limit,
    start,
  });

  let workerResult: Wave1IngestionRunResult["worker"];
  const writesAllowed =
    writeQueue && !reportOnly && !dryRun && result.transcriptGate.passed && !result.stopReason;
  if (ingest && writesAllowed) {
    const { runIngestionWorker } = await import("@/lib/ingestion-pipeline");
    const delayMs = Math.max(
      Number(process.env.CHECK_DELAY_MS ?? 1500),
      Number(process.env.SEED_DELAY_MS ?? 1500)
    );
    workerResult = await runIngestionWorker({
      limit: Math.min(3, Math.max(1, limit)),
      delayMs,
    });
  }

  let corpusMetricsAfter = result.corpusMetricsAfter;
  if (ingest && writesAllowed && workerResult && workerResult.indexed > 0 && result.corpusMetricsBefore) {
    resetPublicMomentsCache();
    corpusMetricsAfter = snapshotCorpusQuality(loadPublicMoments());
  }

  let merged: Wave1IngestionRunResult = {
    ...result,
    flags: { ...result.flags, ingest },
    corpusMetricsAfter,
    worker: workerResult,
    summary: {
      ...result.summary,
      ingested: workerResult?.indexed ?? result.summary.ingested,
      failed: workerResult?.failed ?? result.summary.failed,
    },
  };

  const jsonPath = join(process.cwd(), "data", "wave-1-ingestion-results.json");
  const dryReportPath = join(process.cwd(), "WAVE_1_INGESTION_DRY_RUN_REPORT.md");
  const execPath = join(process.cwd(), "WAVE_1_INGESTION_EXECUTION_REPORT.md");

  function topicCoverageGainSummaryFrom(m: Wave1IngestionRunResult) {
    return m.rows
      .filter((r) => r.status === "eligible" || r.status === "queued")
      .map((r) => r.expectedTopicCoverageGain)
      .filter(Boolean) as string[];
  }

  function persistWave1Artifacts(m: Wave1IngestionRunResult) {
    const outJson = { ...m, topicCoverageGainSummary: topicCoverageGainSummaryFrom(m) };
    writeFileSync(jsonPath, JSON.stringify(outJson, null, 2), "utf-8");
    writeWave1MarkdownReport(m, dryReportPath, "Wave 1 ingestion — dry run / classification");
    writeExecutionReport(dryReportPath, jsonPath, execPath);
    console.log(`Wrote ${execPath}`);
    console.log(`Wrote ${jsonPath}`);
    console.log(`Wrote ${dryReportPath}`);
  }

  persistWave1Artifacts(merged);

  if (workerResult && workerResult.indexed > 0) {
    console.log("Refreshing public moments + corpus reports after successful ingest…");
    execSync("npm run materialize:public-moments", { stdio: "inherit", cwd: process.cwd() });
    execSync("npm run topic-coverage-report", { stdio: "inherit", cwd: process.cwd() });
    execSync("npm run missing-corpus-report", { stdio: "inherit", cwd: process.cwd() });
    execSync("npm run corpus-health-report", { stdio: "inherit", cwd: process.cwd() });
    resetPublicMomentsCache();
    if (merged.corpusMetricsBefore) {
      merged = { ...merged, corpusMetricsAfter: snapshotCorpusQuality(loadPublicMoments()) };
    }
    persistWave1Artifacts(merged);
  }

  const writesIntended =
    (writeQueue || ingest) && !reportOnly && !dryRun;
  if (writesIntended && merged.stopReason) {
    console.error(`Stopped: ${merged.stopReason}`);
    process.exit(1);
  }
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
