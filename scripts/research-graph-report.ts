#!/usr/bin/env tsx
/**
 * Research Graph v1 snapshot from public corpus.
 *
 *   npm run report:research-graph
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildResearchGraph, formatResearchGraphMarkdown } from "@/lib/graph/build-research-graph";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

function main() {
  const moments = loadPublicMoments();
  const snapshot = buildResearchGraph({ moments });

  const jsonPath = join(process.cwd(), "data", "research-graph.json");
  const mdPath = join(process.cwd(), "RESEARCH_GRAPH_REPORT.md");

  writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), "utf-8");
  writeFileSync(mdPath, formatResearchGraphMarkdown(snapshot), "utf-8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Nodes: ${snapshot.metrics.nodeCount}; edges: ${snapshot.metrics.edgeCount}`);
  console.log(`Enterprise readiness: ${snapshot.metrics.enterpriseReadinessScore} (${snapshot.metrics.enterpriseReadinessLevel})`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
