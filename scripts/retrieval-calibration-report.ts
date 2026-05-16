#!/usr/bin/env tsx
/**
 * Retrieval-quality calibration: density metrics per channel/topic vs transcript hours.
 *
 *   npm run report:retrieval-calibration
 *
 * Reads `data/public-moments.json` and resolves transcript duration from the transcript cache
 * (Supabase and/or `.cache/transcripts` when configured).
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  buildRetrievalCalibrationReport,
  estimateTranscriptHoursFromSegments,
  formatRetrievalCalibrationMarkdown,
} from "@/lib/corpus/retrieval-calibration";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import { getCachedTranscript } from "@/lib/transcript-cache";

const CONCURRENCY = 8;

async function main() {
  loadLocalEnv();
  const moments = loadPublicMoments();
  const videoIds = [...new Set(moments.map((m) => m.videoId))];
  const hoursMap = new Map<string, number | null>();

  for (let i = 0; i < videoIds.length; i += CONCURRENCY) {
    const chunk = videoIds.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const t = await getCachedTranscript(id);
          if (!t?.segments?.length) {
            hoursMap.set(id, null);
            return;
          }
          hoursMap.set(id, estimateTranscriptHoursFromSegments(t.segments));
        } catch {
          hoursMap.set(id, null);
        }
      })
    );
  }

  const summary = buildRetrievalCalibrationReport(moments, hoursMap);
  const md = formatRetrievalCalibrationMarkdown(summary);

  const jsonPath = join(process.cwd(), "data", "retrieval-calibration.json");
  const mdPath = join(process.cwd(), "RETRIEVAL_CALIBRATION_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf-8");
  writeFileSync(mdPath, md, "utf-8");
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
