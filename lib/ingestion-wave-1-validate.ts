/**
 * Shared validation for `data/ingestion-wave-1-candidates.json` (Wave 1 planning file).
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadAllAllowlistEntries, normalizeChannelName } from "@/lib/corpus/source-allowlists";
import { WAVE1_TARGET_TOPIC_SET } from "@/lib/corpus/ingestion-wave-1-target-topics";
import type { CorpusQueueFile, IngestionSourceScoreResult } from "@/lib/corpus/source-types";

export type Wave1PlanCandidate = {
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
  expectedTopicCoverageGain?: string;
  riskLevel?: string;
  rationale?: string;
  sourceQuality: IngestionSourceScoreResult;
};

export type Wave1PlanFile = {
  version?: number;
  wave?: number;
  candidates?: Wave1PlanCandidate[];
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export class Wave1ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wave1ValidationError";
  }
}

export function loadWave1PlanFile(
  path = join(process.cwd(), "data", "ingestion-wave-1-candidates.json")
): Wave1PlanFile {
  if (!existsSync(path)) {
    throw new Wave1ValidationError(`Missing ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as Wave1PlanFile;
}

export async function validateWave1CandidatesFile(
  path = join(process.cwd(), "data", "ingestion-wave-1-candidates.json")
): Promise<Wave1PlanCandidate[]> {
  const doc = loadWave1PlanFile(path);
  const candidates = doc.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Wave1ValidationError("candidates must be a non-empty array");
  }
  if (candidates.length > 50) {
    throw new Wave1ValidationError(`Expected at most 50 candidates, got ${candidates.length}`);
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
      throw new Wave1ValidationError(`Candidate ${c.id ?? "?"} missing required string fields`);
    }
    if (seenIds.has(c.id)) throw new Wave1ValidationError(`Duplicate candidate id: ${c.id}`);
    seenIds.add(c.id);

    if (!YOUTUBE_ID_RE.test(c.videoId)) {
      throw new Wave1ValidationError(`Invalid videoId for ${c.id}: ${c.videoId}`);
    }
    if (seenVideo.has(c.videoId)) throw new Wave1ValidationError(`Duplicate videoId: ${c.videoId}`);
    seenVideo.add(c.videoId);

    const urlLc = c.url.trim().toLowerCase();
    const dk = (c.dedupeKey ?? "").trim().toLowerCase();
    if (rejectedKeys.has(urlLc) || (dk && rejectedKeys.has(dk))) {
      throw new Wave1ValidationError(`Candidate ${c.id} overlaps rejected corpus queue (url or dedupeKey)`);
    }

    if (!Array.isArray(c.targetTopics) || c.targetTopics.length === 0) {
      throw new Wave1ValidationError(`Candidate ${c.id} must have non-empty targetTopics`);
    }
    for (const t of c.targetTopics) {
      if (!WAVE1_TARGET_TOPIC_SET.has(t)) {
        throw new Wave1ValidationError(`Candidate ${c.id} has unknown targetTopic "${t}" (not in Wave 1 topic registry)`);
      }
    }

    const row = allowByNorm.get(normalizeChannelName(c.matchedAllowlistChannel));
    if (!row || !row.enabled) {
      throw new Wave1ValidationError(
        `Candidate ${c.id}: matchedAllowlistChannel "${c.matchedAllowlistChannel}" is not an enabled allowlist row`
      );
    }

    const sq = c.sourceQuality;
    if (!sq || typeof sq.score !== "number" || !sq.tier || !sq.ingestRecommendation) {
      throw new Wave1ValidationError(`Candidate ${c.id}: sourceQuality missing score/tier/ingestRecommendation`);
    }
    if (!Array.isArray(sq.reasons) || !Array.isArray(sq.penalties)) {
      throw new Wave1ValidationError(`Candidate ${c.id}: sourceQuality.reasons and .penalties must be arrays`);
    }

    const recomputed = scoreIngestionSource({
      channelName: c.channelName,
      channelId: c.channelId ?? null,
      videoTitle: c.videoTitle,
      transcriptAvailable: true,
      transcriptSegmentCount: 420,
      durationMinutesEstimate: c.durationMinutesEstimate ?? 55,
    });
    if (
      recomputed.score !== sq.score ||
      recomputed.tier !== sq.tier ||
      recomputed.ingestRecommendation !== sq.ingestRecommendation
    ) {
      throw new Wave1ValidationError(
        `Candidate ${c.id}: sourceQuality mismatch — stored ${sq.score}/${sq.tier}/${sq.ingestRecommendation} vs recomputed ${recomputed.score}/${recomputed.tier}/${recomputed.ingestRecommendation}`
      );
    }
  }

  return candidates;
}
