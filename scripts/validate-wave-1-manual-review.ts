#!/usr/bin/env tsx
/**
 * Validate Wave 1 manual review decisions against the governance shortlist.
 *
 *   npm run validate:wave-1-review
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  validateWave1HumanReview,
  Wave1ManualReviewValidationError,
  type Wave1HumanReviewDecisionsFile,
  type Wave1ManualReviewShortlist,
} from "@/lib/wave-1-manual-review";

function main() {
  const shortlistPath = join(process.cwd(), "data", "wave-1-manual-review-shortlist.json");
  const decisionsPath = join(process.cwd(), "data", "wave-1-human-review-decisions.json");

  if (!existsSync(shortlistPath)) {
    throw new Error(`Missing ${shortlistPath}. Run retrieval-governance-diagnosis first.`);
  }
  if (!existsSync(decisionsPath)) {
    throw new Error(`Missing ${decisionsPath}. Run: npm run prepare:wave-1-review`);
  }

  const shortlist = JSON.parse(readFileSync(shortlistPath, "utf-8")) as Wave1ManualReviewShortlist;
  const review = JSON.parse(readFileSync(decisionsPath, "utf-8")) as Wave1HumanReviewDecisionsFile;

  validateWave1HumanReview({
    shortlist,
    review,
    allowMoreApprovals: process.env.WAVE1_REVIEW_ALLOW_MORE_APPROVALS === "1",
  });

  console.log(`OK — ${review.decisions.length} review rows validated`);
  console.log(`Approved for next batch: ${review.summary.approvedCount}`);
  console.log(`Ready for next ingest batch: ${review.readyForNextIngestBatch}`);
}

try {
  main();
} catch (e) {
  if (e instanceof Wave1ManualReviewValidationError) {
    console.error(e.message);
    process.exit(1);
  }
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
