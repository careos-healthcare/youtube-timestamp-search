import type { IngestionSourceScoreResult } from "./source-types";
import { findAllowlistMatch } from "./source-allowlists";
import { recordCorpusPipelineEvent } from "./corpus-analytics";

const TECH_RE =
  /\b(api|kubernetes|docker|postgres|sql|tensor|model|inference|training|distributed|latency|gpu|cpu|stack|framework|architecture)\b/i;
const EDU_RE =
  /\b(lecture|course|tutorial|university|mit|stanford|berkeley|lesson|seminar|workshop|explained|introduction)\b/i;
const CITE_RE = /\b(paper|study|arxiv|documentation|spec|rfc|according to|evidence|benchmark|experiment)\b/i;
const CLICKBAIT_RE =
  /\b(you won't believe|shocking|destroyed|exposed|gone wrong|reacts|reaction|drama|gossip|feud|worst ever)\b/i;
const REACTION_RE = /\b(reacts|reaction|react to|watching)\b/i;
const COMPILATION_RE = /\b(compilation|#shorts|shorts\b|tiktok)\b/i;
const ENTERTAINMENT_ONLY = /\b(prank|challenge|vlog only|day in the life)\b/i;

export type IngestionSourceScoreInput = {
  channelName?: string;
  channelId?: string | null;
  videoTitle?: string;
  transcriptAvailable?: boolean;
  transcriptSegmentCount?: number;
  /** Rough runtime guess when known (minutes). */
  durationMinutesEstimate?: number;
  allowlistRootDir?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Heuristic ingestion score — NOT audience quality truth.
 * Optimizes for explanation density, cite-ability, and anti-spam priors.
 */
export function scoreIngestionSource(input: IngestionSourceScoreInput): IngestionSourceScoreResult {
  const reasons: string[] = [];
  const penalties: string[] = [];
  let score = 42;

  const title = (input.videoTitle ?? "").toLowerCase();
  const allow = findAllowlistMatch({
    channelName: input.channelName,
    channelId: input.channelId,
    rootDir: input.allowlistRootDir,
  });

  if (allow) {
    score += 22;
    reasons.push(`Allowlisted channel (“${allow.channelName}”, ${allow.trustTier} trust prior)`);
    if (process.env.CORPUS_SCORING_SKIP_ANALYTICS !== "1") {
      recordCorpusPipelineEvent("source_allowlist_match", {
        channelName: allow.channelName,
        category: allow.category,
        trustTier: allow.trustTier,
      });
    }
    score += allow.ingestPriority * 0.06;
    score += allow.explanationDensityEstimate * 10;
    score += allow.citationLikelihood * 8;
  } else {
    penalties.push("Not on curated allowlist — neutral prior (not a ban).");
  }

  if (input.transcriptAvailable) {
    score += 12;
    reasons.push("Transcript available for preflight");
  } else {
    score -= 10;
    penalties.push("Transcript unavailable in preflight context");
  }

  const segs = input.transcriptSegmentCount ?? 0;
  if (segs >= 400) {
    score += 8;
    reasons.push("Long transcript (high segment count) — long-form prior");
  } else if (segs > 0 && segs < 80) {
    score -= 8;
    penalties.push("Short transcript — possible clip / low density");
  }

  const dur = input.durationMinutesEstimate;
  if (dur != null && dur >= 25) {
    score += 6;
    reasons.push("Long runtime estimate — lecture/podcast shaped");
  } else if (dur != null && dur < 6) {
    score -= 6;
    penalties.push("Very short runtime — likely clip / low research value");
  }

  if (title) {
    if (TECH_RE.test(title)) {
      score += 7;
      reasons.push("Technical tokens in title");
    }
    if (EDU_RE.test(title)) {
      score += 6;
      reasons.push("Educational / course language in title");
    }
    if (CITE_RE.test(title)) {
      score += 5;
      reasons.push("Citation-friendly language in title");
    }
    if (CLICKBAIT_RE.test(title) || REACTION_RE.test(title)) {
      score -= 18;
      penalties.push("Clickbait / reaction pattern in title");
    }
    if (COMPILATION_RE.test(title)) {
      score -= 14;
      penalties.push("Compilation / shorts pattern in title");
    }
    if (ENTERTAINMENT_ONLY.test(title)) {
      score -= 12;
      penalties.push("Entertainment-first title cue");
    }
  }

  score = clamp(Math.round(score), 0, 100);

  let tier: IngestionSourceScoreResult["tier"] = "C";
  if (score >= 78) tier = "A";
  else if (score >= 62) tier = "B";
  else if (score < 38) tier = "D";

  let ingestRecommendation: IngestionSourceScoreResult["ingestRecommendation"] = "candidate";
  if (tier === "A" && !penalties.some((p) => p.includes("reaction") || p.includes("shorts"))) {
    ingestRecommendation = "promote";
  } else if (tier === "D" || penalties.length >= 3) {
    ingestRecommendation = "reject";
  }

  const result: IngestionSourceScoreResult = { score, tier, reasons, penalties, ingestRecommendation };

  if (process.env.CORPUS_SCORING_SKIP_ANALYTICS !== "1") {
    recordCorpusPipelineEvent("ingestion_source_scored", {
      score,
      tier,
      ingestRecommendation,
      channelName: input.channelName,
      hasAllowlist: Boolean(allow),
    });
  }

  return result;
}
