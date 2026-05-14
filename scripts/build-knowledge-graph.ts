#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  buildKnowledgeGraph,
  formatKnowledgeGraphMarkdown,
} from "../lib/knowledge-graph/graph-builder";

async function main() {
  loadLocalEnv();
  const graph = await buildKnowledgeGraph(8);
  const outputDir = join(process.cwd(), "data", "knowledge-graph");
  mkdirSync(outputDir, { recursive: true });

  const markdownPath = join(process.cwd(), "KNOWLEDGE_GRAPH_REPORT.md");
  const jsonPath = join(outputDir, "graph.json");

  writeFileSync(markdownPath, formatKnowledgeGraphMarkdown(graph), "utf8");
  writeFileSync(jsonPath, JSON.stringify(graph, null, 2), "utf8");

  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Entities: ${graph.entities.length}`);
  console.log(`Relationships: ${graph.relationships.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
