#!/usr/bin/env tsx
/**
 * Build Wave 1 human review pack from governance shortlist + ranked simulation.
 *
 *   npm run prepare:wave-1-review
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { VideoEvalSlice } from "@/lib/corpus/retrieval-weight-validation";
import { loadWave1PlanFile } from "@/lib/ingestion-wave-1-validate";
import {
  formatWave1ManualReviewMarkdown,
  prepareWave1HumanReview,
  type Wave1HumanReviewDecisionsFile,
  type Wave1ManualReviewShortlist,
} from "@/lib/wave-1-manual-review";

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function main() {
  const shortlistPath = join(process.cwd(), "data", "wave-1-manual-review-shortlist.json");
  const rankedPath = join(process.cwd(), "data", "ingestion-wave-1-ranked.json");
  const diagnosisPath = join(process.cwd(), "data", "retrieval-governance-diagnosis.json");
  const decisionsPath = join(process.cwd(), "data", "wave-1-human-review-decisions.json");
  const mdPath = join(process.cwd(), "WAVE_1_MANUAL_REVIEW.md");
  const evalPath = join(process.cwd(), "data", "retrieval-quality-evaluation.json");

  const shortlist = readJson<Wave1ManualReviewShortlist>(shortlistPath);
  const ranked = readJson<{ ranked: Parameters<typeof prepareWave1HumanReview>[0]["ranked"]["ranked"] }>(
    rankedPath
  );
  const diagnosis = readJson<Parameters<typeof prepareWave1HumanReview>[0]["diagnosis"]>(diagnosisPath);

  const wave1 = loadWave1PlanFile();
  const candidateByVideoId = new Map(
    (wave1.candidates ?? []).map((c) => [c.videoId, c])
  );

  let evalByVideoId = new Map<string, VideoEvalSlice>();
  if (existsSync(evalPath)) {
    const eval_ = readJson<{ videos: VideoEvalSlice[] }>(evalPath);
    evalByVideoId = new Map(eval_.videos.map((v) => [v.videoId, v]));
  }

  let existing: Wave1HumanReviewDecisionsFile | null = null;
  if (existsSync(decisionsPath)) {
    existing = readJson<Wave1HumanReviewDecisionsFile>(decisionsPath);
  }

  const pack = prepareWave1HumanReview({
    shortlist,
    ranked,
    diagnosis,
    candidateByVideoId,
    evalByVideoId,
    existing,
  });

  writeFileSync(decisionsPath, JSON.stringify(pack, null, 2), "utf-8");
  writeFileSync(mdPath, formatWave1ManualReviewMarkdown(pack), "utf-8");

  console.log(`Wrote ${decisionsPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Rows: ${pack.summary.totalRows}; approved: ${pack.summary.approvedCount}`);
  console.log(`Ready for next ingest batch: ${pack.readyForNextIngestBatch}`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
