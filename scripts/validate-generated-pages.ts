#!/usr/bin/env tsx

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  isSpamOrNoisePhrase,
} from "../lib/page-generation/page-quality-guard";
import type { PageGenerationResult } from "../lib/page-generation/page-generation-report";
import { TOPIC_SEEDS } from "../lib/topic-seeds";

function loadGeneratedPages(): PageGenerationResult {
  const jsonPath = join(process.cwd(), "data", "page-generation", "generated-pages.json");
  assert.ok(existsSync(jsonPath), "Missing data/page-generation/generated-pages.json — run npm run pages:generate");
  return JSON.parse(readFileSync(jsonPath, "utf8")) as PageGenerationResult;
}

function testSpamRejection() {
  assert.equal(isSpamOrNoisePhrase("data"), true);
  assert.equal(isSpamOrNoisePhrase("y combinator startup school"), false);
}

function testDuplicateSlugDetection(pages: PageGenerationResult) {
  const slugs = pages.pages.map((page) => page.slug);
  assert.equal(new Set(slugs).size, slugs.length, "Duplicate generated page slugs detected");
}

function testThinContentFlags(pages: PageGenerationResult) {
  for (const page of pages.pages) {
    if (page.momentCount < 3) {
      assert.equal(page.sitemapEligible, false, `Thin page should not be sitemap eligible: ${page.phrase}`);
    }
  }
}

function testInternalLinkIntegrity(pages: PageGenerationResult) {
  for (const page of pages.pages) {
    for (const topic of page.relatedTopics) {
      assert.ok(TOPIC_SEEDS.some((seed) => seed.slug === topic) || topic.length > 0);
    }
    for (const video of page.relatedVideos) {
      assert.ok(video.videoId.length > 0);
      assert.ok(video.href.startsWith("/video/"));
    }
  }
}

function testSitemapEligibility(pages: PageGenerationResult) {
  for (const page of pages.pages) {
    if (page.momentCount < 3) {
      assert.equal(page.sitemapEligible, false, `Thin page in sitemap: ${page.phrase}`);
    } else {
      assert.equal(page.sitemapEligible, !page.noindex, `Sitemap flag mismatch: ${page.phrase}`);
    }
  }
}

async function main() {
  loadLocalEnv();
  testSpamRejection();
  const pages = loadGeneratedPages();
  testDuplicateSlugDetection(pages);
  testThinContentFlags(pages);
  testInternalLinkIntegrity(pages);
  testSitemapEligibility(pages);
  console.log("page-generation validation passed");
  console.log(`Accepted pages: ${pages.acceptedCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
