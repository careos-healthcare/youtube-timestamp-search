#!/usr/bin/env tsx

import assert from "node:assert/strict";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  buildQueryIntelligenceReport,
  loadHighIntentReportFallbackPhrases,
} from "../lib/query-intelligence/build-report";
import { classifyQueryIntent } from "../lib/query-intelligence/intent-classifier";
import { isUsefulQueryPhrase, normalizeQueryPhrase } from "../lib/query-intelligence/query-normalizer";
import { scoreOpportunity } from "../lib/query-intelligence/opportunity-scoring";

function testNormalizer() {
  assert.equal(normalizeQueryPhrase("  What IS RAG? "), "what is rag?");
  assert.equal(isUsefulQueryPhrase("the"), false);
  assert.equal(isUsefulQueryPhrase("kubernetes tutorial"), true);
}

function testIntentClassifier() {
  assert.equal(classifyQueryIntent("what is kubernetes"), "definitional");
  assert.equal(classifyQueryIntent("how to learn python"), "how_to");
  assert.equal(classifyQueryIntent("saas pricing strategy"), "commercial");
}

function testOpportunityScoring() {
  const high = scoreOpportunity({
    phrase: "what is mcp",
    demand: 20,
    zeroResults: 3,
    clicks: 2,
    feedbackYes: 0,
    feedbackNo: 0,
    existingCoverage: 0.1,
    topicDepthGap: 0.7,
    freshnessBoost: 0.5,
    intent: "definitional",
    phraseQuality: 0.82,
  });

  const low = scoreOpportunity({
    phrase: "does not",
    demand: 30,
    zeroResults: 0,
    clicks: 0,
    feedbackYes: 0,
    feedbackNo: 0,
    existingCoverage: 0.9,
    topicDepthGap: 0.1,
    freshnessBoost: 0,
    intent: "general",
    phraseQuality: 0.05,
  });

  assert.ok(high.opportunityScore > low.opportunityScore);
}

async function testReportBuild() {
  loadLocalEnv();
  const report = await buildQueryIntelligenceReport();
  assert.ok(report.generatedAt);
  assert.ok(Array.isArray(report.opportunities));
  assert.ok(report.opportunities.length > 0);
  assert.ok(report.topSearchDemand.length > 0);
}

function testFallbackPhrases() {
  const phrases = loadHighIntentReportFallbackPhrases();
  assert.ok(Array.isArray(phrases));
}

async function main() {
  testNormalizer();
  testIntentClassifier();
  testOpportunityScoring();
  testFallbackPhrases();
  await testReportBuild();
  console.log("query-intelligence validation passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
