#!/usr/bin/env tsx
/**
 * Graph-backed topic deepening queue — elite topics first, not global breadth.
 *
 *   npm run report:topic-deepening
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildTopicDeepeningFromDisk,
  formatTopicDeepeningMarkdown,
} from "@/lib/graph/topic-deepening";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

function main() {
  const moments = loadPublicMoments();
  const report = buildTopicDeepeningFromDisk(moments);

  const jsonPath = join(process.cwd(), "data", "topic-deepening-queue.json");
  const mdPath = join(process.cwd(), "TOPIC_DEEPENING_REPORT.md");

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        graphGeneratedAt: report.graphGeneratedAt,
        summary: report.summary,
        queue: report.queue,
        topDeepenNow: report.topDeepenNow.map((a) => ({
          topicSlug: a.topicSlug,
          label: a.label,
          status: a.status,
          priority: a.priority,
          metrics: a.metrics,
          ingestionCandidates: a.ingestionCandidates,
        })),
        analyses: report.analyses,
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(mdPath, formatTopicDeepeningMarkdown(report), "utf-8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(
    `Showcase-ready: ${report.summary.readyToShowcase}; deepen-next: ${report.summary.deepenNext}; broken: ${report.summary.brokenDoNotPromote}`
  );
  console.log(`Ingest queue rows: ${report.queue.length}; batch videos: ${report.recommendedIngestBatch.length}`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
