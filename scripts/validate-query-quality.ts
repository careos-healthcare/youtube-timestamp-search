#!/usr/bin/env tsx

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  isHighQualitySearchPhrase,
  isJunkPhrase,
  scorePhraseQuality,
} from "../lib/query-quality/phrase-quality-score";
import { isConversationalFillerPhrase } from "../lib/query-quality/stopword-filter";
import {
  buildQueryQualityReport,
  formatQueryQualityMarkdown,
} from "../lib/query-quality/quality-report";

type PhraseDataset = string[];

function loadDataset(name: string): PhraseDataset {
  const path = join(process.cwd(), "data", "query-quality", name);
  assert.ok(existsSync(path), `Missing dataset: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as PhraseDataset;
}

function testGoodPhrases(phrases: PhraseDataset) {
  const failures = phrases.filter((phrase) => !isHighQualitySearchPhrase(phrase));
  assert.equal(failures.length, 0, `Expected high-quality phrases failed: ${failures.join(", ")}`);
}

function testJunkPhrases(phrases: PhraseDataset) {
  const failures = phrases.filter((phrase) => !isJunkPhrase(phrase));
  assert.equal(failures.length, 0, `Expected junk phrases not rejected: ${failures.join(", ")}`);
}

function testConversationalFiller(phrases: PhraseDataset) {
  const failures = phrases.filter((phrase) => !isConversationalFillerPhrase(phrase) && !isJunkPhrase(phrase));
  assert.equal(failures.length, 0, `Expected filler phrases not rejected: ${failures.join(", ")}`);
}

function testAmbiguousPhrases(phrases: PhraseDataset) {
  const failures = phrases.filter((phrase) => {
    const scored = scorePhraseQuality(phrase);
    return scored.isJunk || scored.isHighQuality;
  });
  assert.equal(failures.length, 0, `Ambiguous phrases misclassified: ${failures.map((p) => p).join(", ")}`);
}

function loadOpportunityEntries() {
  const jsonPath = join(process.cwd(), "data", "query-intelligence", "opportunities.json");
  if (!existsSync(jsonPath)) return [] as Array<{ phrase: string; demand: number; freshnessBoost?: number; existingCoverage?: number }>;

  const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as {
    opportunities?: Array<{
      phrase: string;
      demand: number;
      freshnessBoost?: number;
      existingCoverage?: number;
    }>;
  };

  return (parsed.opportunities ?? []).map((item) => ({
    phrase: item.phrase,
    demand: item.demand,
    freshnessBoost: item.freshnessBoost ?? 0,
    existingCoverage: item.existingCoverage ?? 0,
  }));
}

async function main() {
  loadLocalEnv();

  testGoodPhrases(loadDataset("good-phrases.json"));
  testJunkPhrases(loadDataset("junk-phrases.json"));
  testConversationalFiller(loadDataset("conversational-filler.json"));
  testAmbiguousPhrases(loadDataset("ambiguous-phrases.json"));

  const entries = [
    ...loadDataset("good-phrases.json").map((phrase) => ({ phrase, demand: 10 })),
    ...loadDataset("junk-phrases.json").map((phrase) => ({ phrase, demand: 30 })),
    ...loadOpportunityEntries(),
  ];

  const report = buildQueryQualityReport(entries);
  const markdownPath = join(process.cwd(), "QUERY_QUALITY_REPORT.md");
  writeFileSync(markdownPath, formatQueryQualityMarkdown(report), "utf8");

  const topOpportunity = loadOpportunityEntries()[0];
  if (topOpportunity) {
    assert.equal(isJunkPhrase(topOpportunity.phrase), false, "Top ranked opportunity should not be junk");
  }

  console.log("query-quality validation passed");
  console.log(`Wrote ${markdownPath}`);
  console.log(`Junk filtered: ${report.junkFiltered}/${report.evaluatedPhrases}`);
  console.log(`High-quality phrases: ${report.highQualityCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
