#!/usr/bin/env tsx

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { KnowledgeGraph } from "../lib/knowledge-graph/graph-builder";

function loadGraph(): KnowledgeGraph {
  const jsonPath = join(process.cwd(), "data", "knowledge-graph", "graph.json");
  assert.ok(existsSync(jsonPath), "Missing data/knowledge-graph/graph.json — run npm run graph:build");
  return JSON.parse(readFileSync(jsonPath, "utf8")) as KnowledgeGraph;
}

function main() {
  const graph = loadGraph();

  assert.ok(graph.generatedAt);
  assert.ok(Array.isArray(graph.entities));
  assert.ok(graph.entities.length > 0);
  assert.ok(Array.isArray(graph.relationships));
  assert.ok(graph.relationships.length > 0);
  assert.ok(Array.isArray(graph.topics));
  assert.ok(graph.topics.length > 0);
  assert.ok(graph.moatMetrics.answerCoveragePercent >= 0);

  const ids = new Set<string>();
  for (const entity of graph.entities) {
    assert.ok(entity.id.length > 0);
    assert.ok(!ids.has(entity.id), `Duplicate entity id: ${entity.id}`);
    ids.add(entity.id);
  }

  console.log("knowledge-graph validation passed");
  console.log(`Entities: ${graph.entities.length}`);
  console.log(`Relationships: ${graph.relationships.length}`);
}

main();
