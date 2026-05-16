#!/usr/bin/env tsx
/**
 * Diagnostic review: why tuned v1/v2 fail to beat pre-calibration on Wave 1 simulation.
 *
 *   npm run retrieval-governance-diagnosis
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatDiagnosisMarkdown,
  runRetrievalGovernanceDiagnosis,
} from "@/lib/corpus/retrieval-governance-diagnosis";
import type { VideoEvalSlice } from "@/lib/corpus/retrieval-weight-validation";
import { loadWave1PlanFile } from "@/lib/ingestion-wave-1-validate";

function main() {
  const evalPath = join(process.cwd(), "data", "retrieval-quality-evaluation.json");
  if (!existsSync(evalPath)) {
    throw new Error(`Missing ${evalPath}. Run: npm run report:retrieval-quality`);
  }
  const eval_ = JSON.parse(readFileSync(evalPath, "utf-8")) as { videos: VideoEvalSlice[] };
  const wave1 = loadWave1PlanFile();

  const videoById = new Map(eval_.videos.map((v) => [v.videoId, v]));
  const momentCountByChannel = new Map<string, number>();
  for (const v of eval_.videos) {
    const k = v.channelName.trim() || "unknown_channel";
    momentCountByChannel.set(k, (momentCountByChannel.get(k) ?? 0) + v.momentCount);
  }

  const diagnosis = runRetrievalGovernanceDiagnosis({
    candidates: wave1.candidates ?? [],
    videoById,
    momentCountByChannel,
  });

  const jsonPath = join(process.cwd(), "data", "retrieval-governance-diagnosis.json");
  const mdPath = join(process.cwd(), "RETRIEVAL_GOVERNANCE_DIAGNOSIS.md");
  const shortlistPath = join(process.cwd(), "data", "wave-1-manual-review-shortlist.json");

  writeFileSync(jsonPath, JSON.stringify(diagnosis, null, 2), "utf-8");
  writeFileSync(mdPath, formatDiagnosisMarkdown(diagnosis), "utf-8");
  writeFileSync(
    shortlistPath,
    JSON.stringify(
      {
        generatedAt: diagnosis.generatedAt,
        recommendation: diagnosis.recommendation,
        ...diagnosis.manualReviewShortlist,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${shortlistPath}`);
  console.log(`Recommendation: ${diagnosis.recommendation}`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
