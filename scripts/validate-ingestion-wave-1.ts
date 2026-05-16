#!/usr/bin/env tsx
/**
 * Validates `data/ingestion-wave-1-candidates.json` for Wave 1 hygiene.
 *
 *   npm run validate:ingestion-wave-1
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadAllAllowlistEntries, normalizeChannelName } from "@/lib/corpus/source-allowlists";
import { WAVE1_TARGET_TOPIC_SET } from "@/lib/corpus/ingestion-wave-1-target-topics";
import type { CorpusQueueFile, IngestionSourceScoreResult } from "@/lib/corpus/source-types";

type Candidate = {
  id: string;
  videoId: string;
  url: string;
  channelName: string;
  channelId?: string | null;
  matchedAllowlistChannel: string;
  allowlistCategory?: string;
  videoTitle: string;
  targetTopics: string[];
  dedupeKey?: string;
  durationMinutesEstimate?: number;
  sourceQuality: IngestionSourceScoreResult;
};

type WaveFile = {
  version?: number;
  wave?: number;
  candidates?: Candidate[];
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const path = join(process.cwd(), "data", "ingestion-wave-1-candidates.json");
  if (!existsSync(path)) fail(`Missing ${path}`);

  const doc = JSON.parse(readFileSync(path, "utf-8")) as WaveFile;
  const candidates = doc.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    fail("candidates must be a non-empty array");
  }
  if (candidates.length > 50) {
    fail(`Expected at most 50 candidates, got ${candidates.length}`);
  }

  const rejectedPath = join(process.cwd(), "data", "ingestion-queues", "rejected.json");
  const rejectedKeys = new Set<string>();
  if (existsSync(rejectedPath)) {
    const rq = JSON.parse(readFileSync(rejectedPath, "utf-8")) as CorpusQueueFile;
    for (const it of rq.items ?? []) {
      rejectedKeys.add(it.dedupeKey.trim().toLowerCase());
      if (it.url) rejectedKeys.add(it.url.trim().toLowerCase());
    }
  }

  const allow = loadAllAllowlistEntries();
  const allowByNorm = new Map<string, (typeof allow)[number]>();
  for (const a of allow) {
    allowByNorm.set(normalizeChannelName(a.channelName), a);
  }

  const { scoreIngestionSource } = await import("@/lib/corpus/source-quality");

  const seenIds = new Set<string>();
  const seenVideo = new Set<string>();

  for (const c of candidates) {
    if (!c.id || !c.videoId || !c.url || !c.channelName || !c.matchedAllowlistChannel || !c.videoTitle) {
      fail(`Candidate ${c.id ?? "?"} missing required string fields`);
    }
    if (seenIds.has(c.id)) fail(`Duplicate candidate id: ${c.id}`);
    seenIds.add(c.id);

    if (!YOUTUBE_ID_RE.test(c.videoId)) {
      fail(`Invalid videoId for ${c.id}: ${c.videoId}`);
    }
    if (seenVideo.has(c.videoId)) fail(`Duplicate videoId: ${c.videoId}`);
    seenVideo.add(c.videoId);

    const urlLc = c.url.trim().toLowerCase();
    const dk = (c.dedupeKey ?? "").trim().toLowerCase();
    if (rejectedKeys.has(urlLc) || (dk && rejectedKeys.has(dk))) {
      fail(`Candidate ${c.id} overlaps rejected queue (url or dedupeKey)`);
    }

    if (!Array.isArray(c.targetTopics) || c.targetTopics.length === 0) {
      fail(`Candidate ${c.id} must have non-empty targetTopics`);
    }
    for (const t of c.targetTopics) {
      if (!WAVE1_TARGET_TOPIC_SET.has(t)) {
        fail(`Candidate ${c.id} has unknown targetTopic "${t}" (not in Wave 1 topic registry)`);
      }
    }

    const row = allowByNorm.get(normalizeChannelName(c.matchedAllowlistChannel));
    if (!row || !row.enabled) {
      fail(`Candidate ${c.id}: matchedAllowlistChannel "${c.matchedAllowlistChannel}" is not an enabled allowlist row`);
    }

    const sq = c.sourceQuality;
    if (!sq || typeof sq.score !== "number" || !sq.tier || !sq.ingestRecommendation) {
      fail(`Candidate ${c.id}: sourceQuality missing score/tier/ingestRecommendation`);
    }
    if (!Array.isArray(sq.reasons) || !Array.isArray(sq.penalties)) {
      fail(`Candidate ${c.id}: sourceQuality.reasons and .penalties must be arrays`);
    }

    const recomputed = scoreIngestionSource({
      channelName: c.channelName,
      channelId: c.channelId ?? null,
      videoTitle: c.videoTitle,
      transcriptAvailable: true,
      transcriptSegmentCount: 420,
      durationMinutesEstimate: c.durationMinutesEstimate ?? 55,
    });
    if (recomputed.score !== sq.score || recomputed.tier !== sq.tier || recomputed.ingestRecommendation !== sq.ingestRecommendation) {
      fail(
        `Candidate ${c.id}: sourceQuality mismatch — stored ${sq.score}/${sq.tier}/${sq.ingestRecommendation} vs recomputed ${recomputed.score}/${recomputed.tier}/${recomputed.ingestRecommendation}`
      );
    }
  }

  console.log(`OK — ${candidates.length} Wave 1 candidates validated`);
}

void main();
