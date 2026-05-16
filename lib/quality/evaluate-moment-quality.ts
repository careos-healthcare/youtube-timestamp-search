import { CREATOR_DATABASE } from "@/lib/creator-data";
import { scorePhraseQuality, scoreSnippetUsefulness, TECH_BONUS } from "@/lib/moments/public-moment-quality";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { normalizeText } from "@/lib/youtube";

import type { MomentQualityEvaluation, MomentQualityInput, MomentQualityTier } from "./types";

const OPINION_RE =
  /\b(i think|i believe|my guess|probably|maybe|perhaps|imo|in my opinion|feels like|i feel like|controversial|polarized|debatable|not everyone agrees|i could be wrong)\b/i;
const DEBATE_RE = /\b(controvers|debat|disagree|wrong|myth|misconception|risky|dangerous)\b/i;
const EVIDENCE_RE =
  /\b(study|studies|paper|arxiv|experiment|data shows|we measured|evidence|empirical|benchmark|ablation|results show)\b/i;
const EXPLAIN_RE =
  /\b(because|therefore|means that|in other words|for example|specifically|step by step|first,|second,|the reason)\b/i;
const PRIMARY_RE = /\b(according to|official|documentation|the spec|the standard|rfc|ieee)\b/i;
const TUTORIAL_RE = /\b(tutorial|beginner|intro to|getting started|crash course|101|walkthrough)\b/i;

function tierFromScore(s: number): MomentQualityTier {
  if (s >= 68) return "high";
  if (s >= 46) return "medium";
  return "low";
}

function channelAuthorityScore(channelName?: string): { score: number; label?: string } {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return { score: 0 };
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) return { score: 10, label: c.displayName };
    if (c.aliases.some((a) => a.toLowerCase() === ch)) return { score: 9, label: c.displayName };
    if (c.displayName.length > 4 && ch.includes(c.displayName.toLowerCase())) return { score: 8, label: c.displayName };
  }
  if (/\b(university|mit|stanford|research lab|institute)\b/i.test(channelName ?? "")) {
    return { score: 7 };
  }
  if (/\b(freecodecamp|corey schafer|fireship|3blue1brown)\b/i.test(ch)) {
    return { score: 8 };
  }
  return { score: 3 };
}

function snippetCoherence(snippet: string, phrase: string): { score: number; note?: string } {
  const sq = scoreSnippetUsefulness(snippet, phrase);
  if (!sq.ok) return { score: 0, note: sq.reason };
  const s = normalizeText(snippet);
  const words = s.split(/\s+/).filter(Boolean);
  const uniq = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const dupRatio = words.length ? 1 - uniq.size / words.length : 0;
  let score = 8;
  if (dupRatio > 0.45) {
    score -= 6;
  }
  if (/(\b\w+\b)(\s+\1){3,}/i.test(s)) {
    score -= 5;
  }
  return { score: Math.max(0, score) };
}

function fillerPenalty(snippet: string, phrase: string): number {
  const s = normalizeText(snippet).toLowerCase();
  let p = 0;
  const ums = (s.match(/\b(um|uh|like,|you know)\b/g) ?? []).length;
  p += Math.min(10, ums * 2);
  if (s.length < 90) p += 4;
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0]!.length < 6) p += 6;
  return Math.min(18, p);
}

function technicalDepth(phrase: string, snippet: string, title: string): number {
  const hay = `${phrase} ${snippet} ${title}`.toLowerCase();
  let n = 0;
  for (const t of TECH_BONUS) {
    if (hay.includes(t)) {
      n += 1;
      if (n >= 4) break;
    }
  }
  return Math.min(16, n * 4);
}

function explanationDensity(snippet: string): number {
  const s = normalizeText(snippet);
  let score = 6;
  if (s.length >= 140) score += 6;
  if (s.length >= 220) score += 4;
  const sentences = s.split(/[.!?]+/).filter((x) => x.trim().length > 12);
  score += Math.min(8, sentences.length * 2);
  if (EXPLAIN_RE.test(s)) score += 6;
  return Math.min(22, score);
}

function evidenceScore(snippet: string): number {
  return EVIDENCE_RE.test(normalizeText(snippet)) ? 12 : 0;
}

function timestampContext(startSeconds?: number): { score: number; fast: boolean } {
  if (startSeconds == null || Number.isNaN(startSeconds)) return { score: 0, fast: false };
  if (startSeconds < 90) return { score: 2, fast: true };
  if (startSeconds > 3600) return { score: 3, fast: false };
  return { score: 1, fast: false };
}

function normalizeMaterialization(raw?: number): number {
  if (raw == null || Number.isNaN(raw)) return 0;
  return Math.min(38, Math.max(0, raw * 0.17));
}

/**
 * Heuristic quality layer: usefulness / clarity / context — not factual correctness.
 */
export function evaluateMomentQualitySignals(input: MomentQualityInput): MomentQualityEvaluation {
  const phrase = normalizeText(input.phrase).trim();
  const snippet = normalizeText(input.snippet);
  const title = normalizeText(input.videoTitle ?? "");
  const channel = input.channelName?.trim();

  const phraseQ = scorePhraseQuality(phrase);
  const specificity = Math.min(18, Math.max(0, 9 + phraseQ.score * 0.08));

  const explain = explanationDensity(snippet);
  const evidence = evidenceScore(snippet);
  const tech = technicalDepth(phrase, snippet, title);
  const auth = channelAuthorityScore(channel);
  const coh = snippetCoherence(snippet, phrase);
  const filler = fillerPenalty(snippet, phrase);
  const opinion = OPINION_RE.test(`${snippet} ${phrase}`) ? 14 : 0;
  const debateBonus = DEBATE_RE.test(`${snippet} ${phrase}`) ? 4 : 0;
  const primary = PRIMARY_RE.test(snippet) ? 5 : 0;
  const tutorial = TUTORIAL_RE.test(`${title} ${snippet}`) ? 6 : 0;
  const ts = timestampContext(input.startSeconds);

  const semanticBoost =
    (input.extractionKinds?.some((k) =>
      ["explanation", "definition", "framework", "comparison", "argument"].includes(k)
    )
      ? 8
      : 0) + Math.min(6, (input.semanticRank ?? 0) * 0.04);

  const citeBoost =
    input.extractionKinds && input.extractionKinds.length > 0 && (input.materializationScore ?? 0) > 80 ? 3 : 0;

  const engagement = Math.min(10, Math.max(0, input.engagementBoost ?? 0));

  let raw =
    specificity +
    explain +
    evidence +
    tech +
    auth.score +
    coh.score +
    semanticBoost +
    citeBoost +
    engagement +
    primary +
    tutorial +
    debateBonus +
    ts.score +
    normalizeMaterialization(input.materializationScore);

  raw -= filler + opinion;

  const qualityScore = Math.max(0, Math.min(100, Math.round(raw)));
  const qualityTier = tierFromScore(qualityScore);

  const signals: string[] = [];
  const warnings: string[] = [];

  if (evidence > 0) signals.push("Evidence-forward");
  else if (explain >= 14 && tech >= 8) signals.push("High-signal explanation");
  else if (explain >= 12) signals.push("Dense explanation");

  if (tech >= 8 && (TUTORIAL_RE.test(title) || title.toLowerCase().includes("course"))) {
    signals.push("Technical walkthrough");
  } else if (tech >= 8) {
    signals.push("Technical content");
  }

  if (tutorial || title.toLowerCase().includes("beginner")) {
    signals.push("Beginner-friendly");
  }

  if (opinion > 0) {
    signals.push("Opinion / speculation");
    warnings.push("Sounds like subjective take — verify claims independently.");
  }

  if (debateBonus > 0) {
    signals.push("Debated / contested topic");
    warnings.push("Topic may be polarized; excerpt is one speaker’s framing.");
  }

  if (ts.fast && snippet.length < 200) {
    signals.push("Fast clip");
  }

  if (primary > 0) signals.push("Primary-source style");

  if (engagement >= 4) {
    signals.push("Frequently engaged (local)");
  }

  if (coh.note) {
    warnings.push(`Snippet match: ${coh.note}`);
  }

  if (qualityTier === "low" || coh.score < 4) {
    signals.push("Weak context");
    warnings.push("Short or messy excerpt — ranking is uncertain.");
  }

  if (filler >= 8) {
    warnings.push("High filler / disfluency in excerpt.");
  }

  if (signals.length === 0) {
    signals.push("Transcript excerpt");
  }

  const primarySignals = signals.slice(0, 3);

  const whyThisRanks: string[] = [];
  whyThisRanks.push(`Matched phrase “${phrase.length > 120 ? `${phrase.slice(0, 120)}…` : phrase}”.`);
  whyThisRanks.push(
    `Explanation density heuristic: ${explain}/22; specificity from phrase shape: ${specificity.toFixed(0)}/18.`
  );
  if (channel) {
    whyThisRanks.push(
      auth.label
        ? `Channel “${channel}” matches indexed creator profile “${auth.label}” (authority hint only).`
        : `Channel “${channel}” — no strong creator-profile match; treat as neutral context.`
    );
  } else {
    whyThisRanks.push("Channel unknown — authority not inferred.");
  }
  if (input.topic || input.category) {
    whyThisRanks.push(`Indexed labels: ${[input.topic, input.category].filter(Boolean).join(" · ")}.`);
  }
  whyThisRanks.push("This is a transcript excerpt, not an independent fact check.");

  const rankingKey =
    qualityScore * 1.35 +
    (input.materializationScore ?? 0) * 0.22 +
    (input.semanticRank ?? 0) * 0.05 -
    (opinion > 0 ? 8 : 0) -
    (filler >= 10 ? 6 : 0);

  return {
    qualityScore,
    qualityTier,
    signals: primarySignals,
    warnings,
    whyThisRanks,
    rankingKey,
  };
}

export function publicMomentToQualityInput(row: PublicMomentRecord): MomentQualityInput {
  return {
    phrase: row.phrase,
    snippet: row.snippet,
    videoTitle: row.videoTitle,
    channelName: row.channelName,
    category: row.category,
    topic: row.topic,
    materializationScore: row.qualityScore,
    startSeconds: row.startSeconds,
    semanticRank: row.semantic?.totalSemanticRank,
    extractionKinds: row.semantic?.extractionKinds,
  };
}

export function evaluatePublicMoment(row: PublicMomentRecord): MomentQualityEvaluation {
  return evaluateMomentQualitySignals(publicMomentToQualityInput(row));
}

/** Stable ordering for pools and hubs — higher is better. */
export function momentQualityRankingKey(row: PublicMomentRecord): number {
  return evaluatePublicMoment(row).rankingKey;
}
