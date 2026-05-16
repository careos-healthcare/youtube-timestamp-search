/**
 * Retrieval-quality scoring from transcript text (+ optional materialized moments).
 * All outputs are explainable; no opaque composite blobs without per-dimension breakdown.
 */

import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { evaluatePublicMoment } from "@/lib/quality";

export type TranscriptSegmentInput = {
  text: string;
  start?: number;
  duration?: number;
};

export type RetrievalQualityScoreInput = {
  videoId: string;
  videoTitle?: string;
  channelName?: string;
  segments: TranscriptSegmentInput[];
  /** When present, clip / semantic yield uses materialized public moments for this video. */
  momentsForVideo?: PublicMomentRecord[];
  transcriptHours?: number | null;
};

export type RetrievalQualityDimensionId =
  | "explanation_density"
  | "multi_speaker_penalty"
  | "filler_ratio"
  | "repeated_phrase_ratio"
  | "citation_richness"
  | "technical_terminology_density"
  | "actionable_tutorial_density"
  | "concrete_example_density"
  | "question_answer_density"
  | "speculation_opinion_ratio"
  | "transcript_coherence"
  | "clip_extraction_quality"
  | "semantic_moment_yield"
  | "average_accepted_moment_score";

export type RetrievalQualityDimension = {
  id: RetrievalQualityDimensionId;
  /** Human-readable label for reports. */
  label: string;
  /** Raw statistic before normalization (units vary by dimension). */
  raw: number;
  /** 0–1 where higher is better for retrieval (penalties are inverted here). */
  normalized: number;
  /** Explainable detail for debugging. */
  detail: string;
};

export type RetrievalRejectHeuristicId =
  | "excessive_intro_outro_cta"
  | "sponsor_heavy"
  | "repeated_cta_language"
  | "low_information_conversational_drift"
  | "generic_ai_news_chatter"
  | "top_ten_fluff"
  | "poor_semantic_extraction_yield";

export type RetrievalRejectHeuristic = {
  id: RetrievalRejectHeuristicId;
  matched: boolean;
  explanation: string;
};

export type RetrievalQualityFlags = {
  lowRetrievalValue: boolean;
  poorCitationValue: boolean;
  weakEducationalDensity: boolean;
  reasons: string[];
};

export type RetrievalQualityTier = "A" | "B" | "C" | "D";

export type RetrievalQualityResult = {
  videoId: string;
  overallNormalized: number;
  tier: RetrievalQualityTier;
  dimensions: RetrievalQualityDimension[];
  rejectHeuristics: RetrievalRejectHeuristic[];
  flags: RetrievalQualityFlags;
};

const FILLER_RE = /\b(um|uh|er|ah|like,|you know|i mean|sort of|kind of)\b/gi;
const CITE_RE =
  /\b(paper|papers|arxiv|study|studies|experiment|benchmark|evidence|documentation|the spec|rfc|according to|we measured|data shows)\b/gi;
const TECH_RE =
  /\b(api|kubernetes|docker|postgres|sql|tensor|transformer|embedding|inference|training|gpu|cpu|latency|scheduler|architecture|protocol|llm|model weights)\b/gi;
const ACTION_RE =
  /\b(how to|step \d|first,|second,|next,|run this|install|configure|implement|deploy|exercise|walkthrough)\b/gi;
const EXAMPLE_RE =
  /\b(for example|for instance|e\.g\.|specifically|imagine|suppose|consider the case|concretely)\b/gi;
const QA_RE = /\?|let me answer|the question is|good question\b/gi;
const SPECULATION_RE =
  /\b(i think|i believe|my guess|probably|maybe|perhaps|imo|in my opinion|could be wrong|not sure|speculat)\b/gi;
const SPEAKER_LINE_RE = /^(?:[A-Z][a-z]+\s+){0,2}[A-Z][a-z]+:\s|\[[^\]]+\]:|>>\s*\w+/m;
const CTA_RE =
  /\b(like and subscribe|hit subscribe|smash like|ring the bell|patreon|sponsor|promo code|link in description|join the discord)\b/gi;
const AI_NEWS_FLUFF_RE =
  /\b(breaking|latest ai|ai news|top \d+|top ten|trends to watch|everything you need to know|game.?changer)\b/gi;
const TOP_TEN_RE = /\b(top\s*(10|five|5|seven|7)\s+(trends|ways|tips|tools|predictions))\b/gi;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function joinText(segments: TranscriptSegmentInput[]): string {
  return segments
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateMultiSpeakerPenalty(segments: TranscriptSegmentInput[]): { raw: number; detail: string } {
  if (!segments.length) return { raw: 0, detail: "no segments" };
  let short = 0;
  let speakerish = 0;
  for (const seg of segments) {
    const t = seg.text.trim();
    if (t.length > 0 && t.length < 28) short += 1;
    if (SPEAKER_LINE_RE.test(t)) speakerish += 1;
  }
  const shortRatio = short / segments.length;
  const speakerRatio = speakerish / Math.max(1, segments.length);
  const raw = clamp01(shortRatio * 0.55 + speakerRatio * 2.2);
  return {
    raw,
    detail: `short_segments_share=${(shortRatio * 100).toFixed(1)}% speakerish_lines=${speakerish}/${segments.length}`,
  };
}

function fillerRatio(text: string): { raw: number; detail: string } {
  const m = text.match(FILLER_RE);
  const wc = wordCount(text) || 1;
  const raw = clamp01(((m?.length ?? 0) / wc) * 18);
  return { raw, detail: `filler_hits=${m?.length ?? 0} per ~${wc} words` };
}

function repeatedPhraseRatio(text: string): { raw: number; detail: string } {
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  if (words.length < 40) return { raw: 0, detail: "too_short_for_ngram" };
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  const counts = new Map<string, number>();
  for (const b of bigrams) {
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let max = 0;
  for (const c of counts.values()) max = Math.max(max, c);
  const raw = clamp01(max / (bigrams.length * 0.02));
  return { raw, detail: `max_bigram_repeat=${max} over ${bigrams.length} bigrams` };
}

function densityHits(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function explanationDensityScore(text: string, wc: number): { raw: number; detail: string } {
  const explainHits =
    densityHits(
      text,
      /\b(because|therefore|means that|in other words|the reason|so that|as a result|in practice|underlying)\b/gi
    ) + densityHits(text, /\b(define|definition|intuition|formally)\b/gi);
  const raw = wc > 0 ? clamp01((explainHits / wc) * 40) : 0;
  return { raw, detail: `explanation_cues=${explainHits} per ~${wc} words` };
}

function transcriptCoherence(segments: TranscriptSegmentInput[]): { raw: number; detail: string } {
  if (!segments.length) return { raw: 0, detail: "empty" };
  const lens = segments.map((s) => s.text.trim().length);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const var_ =
    lens.reduce((acc, l) => acc + (l - avg) ** 2, 0) / lens.length;
  const std = Math.sqrt(var_);
  const jitter = std / (avg + 8);
  const raw = clamp01(1 - jitter * 1.4);
  return {
    raw,
    detail: `mean_seg_len=${avg.toFixed(0)} std=${std.toFixed(1)} jitter_norm=${jitter.toFixed(3)}`,
  };
}

function clipExtractionQuality(moments: PublicMomentRecord[] | undefined): {
  raw: number;
  detail: string;
  avgScore: number;
  accepted: number;
} {
  if (!moments?.length) {
    return { raw: 0.45, detail: "no_materialized_moments_proxy_neutral", avgScore: 0, accepted: 0 };
  }
  let sum = 0;
  let accepted = 0;
  for (const m of moments) {
    const ev = evaluatePublicMoment(m);
    sum += ev.qualityScore;
    if (ev.qualityTier !== "low") accepted += 1;
  }
  const avg = sum / moments.length;
  const raw = clamp01((avg - 35) / 55);
  return {
    raw,
    detail: `avg_moment_quality_score=${avg.toFixed(1)} accepted_non_low=${accepted}/${moments.length}`,
    avgScore: avg,
    accepted,
  };
}

function averageAcceptedMomentScoreOnly(moments: PublicMomentRecord[] | undefined): {
  raw: number;
  detail: string;
} {
  if (!moments?.length) {
    return { raw: 0.45, detail: "no_moments" };
  }
  const scores: number[] = [];
  for (const m of moments) {
    const ev = evaluatePublicMoment(m);
    if (ev.qualityTier !== "low") scores.push(ev.qualityScore);
  }
  if (!scores.length) {
    return { raw: 0.2, detail: "all_moments_low_tier" };
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const raw = clamp01((avg - 38) / 52);
  return {
    raw,
    detail: `avg_score_accepted_only=${avg.toFixed(1)} n=${scores.length}`,
  };
}

function semanticMomentYield(
  moments: PublicMomentRecord[] | undefined,
  transcriptHours: number | null | undefined
): { raw: number; detail: string } {
  if (!moments?.length) {
    return { raw: 0.35, detail: "no_moments_semantic_yield_unknown" };
  }
  let withKinds = 0;
  for (const m of moments) {
    const k = m.semantic?.extractionKinds?.length ?? 0;
    if (k > 0) withKinds += 1;
  }
  const share = withKinds / moments.length;
  const h = transcriptHours && transcriptHours > 0 ? transcriptHours : null;
  const perHour = h != null ? withKinds / h : null;
  const raw = clamp01(share * 0.55 + (perHour != null ? clamp01(perHour / 12) * 0.45 : 0.2));
  return {
    raw,
    detail: `semantic_kind_moments=${withKinds}/${moments.length}${perHour != null ? ` per_h≈${perHour.toFixed(2)}` : ""}`,
  };
}

function introOutroCtaDensity(segments: TranscriptSegmentInput[]): {
  intro: number;
  outro: number;
  detail: string;
} {
  if (!segments.length) return { intro: 0, outro: 0, detail: "empty" };
  const n = segments.length;
  const head = Math.max(3, Math.floor(n * 0.05));
  const tail = Math.max(3, Math.floor(n * 0.05));
  const headText = segments
    .slice(0, head)
    .map((s) => s.text)
    .join(" ");
  const tailText = segments
    .slice(n - tail)
    .map((s) => s.text)
    .join(" ");
  const intro = (headText.match(CTA_RE) ?? []).length / (wordCount(headText) + 1);
  const outro = (tailText.match(CTA_RE) ?? []).length / (wordCount(tailText) + 1);
  return {
    intro,
    outro,
    detail: `cta_density_intro≈${intro.toFixed(4)} outro≈${outro.toFixed(4)} (first/last 5% segs)`,
  };
}

export function scoreRetrievalQuality(input: RetrievalQualityScoreInput): RetrievalQualityResult {
  const { videoId, segments, momentsForVideo } = input;
  const full = joinText(segments);
  const wc = wordCount(full) || 1;
  const hours = input.transcriptHours ?? null;

  const explain = explanationDensityScore(full, wc);
  const multi = estimateMultiSpeakerPenalty(segments);
  const filler = fillerRatio(full);
  const repeat = repeatedPhraseRatio(full);
  const citeHits = densityHits(full, CITE_RE);
  const citeRaw = clamp01((citeHits / wc) * 120);
  const techHits = densityHits(full, TECH_RE);
  const techRaw = clamp01((techHits / wc) * 90);
  const actionHits = densityHits(full, ACTION_RE);
  const actionRaw = clamp01((actionHits / wc) * 100);
  const exHits = densityHits(full, EXAMPLE_RE);
  const exRaw = clamp01((exHits / wc) * 140);
  const qaHits = densityHits(full, QA_RE);
  const qaRaw = clamp01((qaHits / wc) * 55);
  const specHits = densityHits(full, SPECULATION_RE);
  const specRaw = clamp01((specHits / wc) * 70);
  const coherence = transcriptCoherence(segments);
  const clip = clipExtractionQuality(momentsForVideo);
  const semYield = semanticMomentYield(momentsForVideo, hours);
  const avgAcceptedOnly = averageAcceptedMomentScoreOnly(momentsForVideo);

  const inv = (x: number) => clamp01(1 - x);

  const dimensions: RetrievalQualityDimension[] = [
    {
      id: "explanation_density",
      label: "Explanation density",
      raw: explain.raw,
      normalized: explain.raw,
      detail: explain.detail,
    },
    {
      id: "multi_speaker_penalty",
      label: "Multi-speaker / panel chaos (inverted)",
      raw: multi.raw,
      normalized: inv(multi.raw),
      detail: multi.detail,
    },
    {
      id: "filler_ratio",
      label: "Filler disfluency (inverted)",
      raw: filler.raw,
      normalized: inv(filler.raw),
      detail: filler.detail,
    },
    {
      id: "repeated_phrase_ratio",
      label: "Repeated phrase / loopiness (inverted)",
      raw: repeat.raw,
      normalized: inv(repeat.raw),
      detail: repeat.detail,
    },
    {
      id: "citation_richness",
      label: "Citation / evidence language",
      raw: citeRaw,
      normalized: citeRaw,
      detail: `cite_cue_hits=${citeHits} per ~${wc} words`,
    },
    {
      id: "technical_terminology_density",
      label: "Technical terminology density",
      raw: techRaw,
      normalized: techRaw,
      detail: `tech_token_hits=${techHits} per ~${wc} words`,
    },
    {
      id: "actionable_tutorial_density",
      label: "Actionable / procedural language",
      raw: actionRaw,
      normalized: actionRaw,
      detail: `action_hits=${actionHits} per ~${wc} words`,
    },
    {
      id: "concrete_example_density",
      label: "Concrete example framing",
      raw: exRaw,
      normalized: exRaw,
      detail: `example_hits=${exHits} per ~${wc} words`,
    },
    {
      id: "question_answer_density",
      label: "Question–answer rhythm",
      raw: qaRaw,
      normalized: qaRaw,
      detail: `qa_cues=${qaHits} per ~${wc} words`,
    },
    {
      id: "speculation_opinion_ratio",
      label: "Speculation / opinion (inverted)",
      raw: specRaw,
      normalized: inv(specRaw),
      detail: `speculation_hits=${specHits} per ~${wc} words`,
    },
    {
      id: "transcript_coherence",
      label: "Segment length coherence",
      raw: coherence.raw,
      normalized: coherence.raw,
      detail: coherence.detail,
    },
    {
      id: "clip_extraction_quality",
      label: "Clip extraction quality (materialized moments)",
      raw: clip.raw,
      normalized: clip.raw,
      detail: clip.detail,
    },
    {
      id: "semantic_moment_yield",
      label: "Semantic extraction yield",
      raw: semYield.raw,
      normalized: semYield.raw,
      detail: semYield.detail,
    },
    {
      id: "average_accepted_moment_score",
      label: "Average accepted moment score (quality model)",
      raw: avgAcceptedOnly.raw,
      normalized: avgAcceptedOnly.raw,
      detail: avgAcceptedOnly.detail,
    },
  ];

  const weights: Partial<Record<RetrievalQualityDimensionId, number>> = {
    explanation_density: 0.12,
    multi_speaker_penalty: 0.06,
    filler_ratio: 0.08,
    repeated_phrase_ratio: 0.06,
    citation_richness: 0.1,
    technical_terminology_density: 0.1,
    actionable_tutorial_density: 0.07,
    concrete_example_density: 0.06,
    question_answer_density: 0.06,
    speculation_opinion_ratio: 0.06,
    transcript_coherence: 0.07,
    clip_extraction_quality: 0.08,
    semantic_moment_yield: 0.08,
    average_accepted_moment_score: 0.07,
  };

  let wSum = 0;
  let acc = 0;
  for (const d of dimensions) {
    const w = weights[d.id] ?? 0;
    acc += d.normalized * w;
    wSum += w;
  }
  const overallNormalized = wSum > 0 ? clamp01(acc / wSum) : 0;

  const introOut = introOutroCtaDensity(segments);
  const sponsorHits = densityHits(full, /\b(sponsor|sponsored by|brought to you by|ad break)\b/gi);
  const ctaHits = (full.match(CTA_RE) ?? []).length;
  const aiFluffHits = densityHits(full, AI_NEWS_FLUFF_RE) + densityHits(full, TOP_TEN_RE);
  const drift = filler.raw > 0.42 && techRaw < 0.18;

  let semanticYieldPoor = false;
  if (momentsForVideo && momentsForVideo.length > 0 && hours && hours > 0.08) {
    const withKinds = momentsForVideo.filter((m) => (m.semantic?.extractionKinds?.length ?? 0) > 0).length;
    const kindShare = withKinds / momentsForVideo.length;
    const perHour = momentsForVideo.length / hours;
    semanticYieldPoor = kindShare < 0.12 || perHour < 1.5;
  }

  const rejectHeuristics: RetrievalRejectHeuristic[] = [
    {
      id: "excessive_intro_outro_cta",
      matched: introOut.intro > 0.045 || introOut.outro > 0.045,
      explanation: `CTA-like language concentrated in first/last 5% of cues (${introOut.detail})`,
    },
    {
      id: "sponsor_heavy",
      matched: sponsorHits >= 6 || sponsorHits / wc >= 0.012,
      explanation: `Sponsor/ad-break cues hit=${sponsorHits} in transcript`,
    },
    {
      id: "repeated_cta_language",
      matched: ctaHits >= 14 || ctaHits / wc >= 0.018,
      explanation: `Repeated CTA/marketing phrases hit=${ctaHits}`,
    },
    {
      id: "low_information_conversational_drift",
      matched: drift,
      explanation: `High filler (${filler.detail}) with low technical cue density`,
    },
    {
      id: "generic_ai_news_chatter",
      matched: aiFluffHits >= 4,
      explanation: `Generic AI-news / hype phrasing hits=${aiFluffHits}`,
    },
    {
      id: "top_ten_fluff",
      matched: TOP_TEN_RE.test(full),
      explanation: "Top-N listicle framing detected in transcript",
    },
    {
      id: "poor_semantic_extraction_yield",
      matched: Boolean(semanticYieldPoor),
      explanation:
        "Materialized moments show sparse semantic extraction kinds relative to transcript length",
    },
  ];

  const flagReasons: string[] = [];
  if (overallNormalized < 0.38) flagReasons.push("Overall retrieval normalized score < 0.38");
  if (rejectHeuristics.filter((r) => r.matched).length >= 3) {
    flagReasons.push("Three or more reject heuristics matched (review; do not auto-delete)");
  }
  if (citeRaw < 0.08 && techRaw < 0.12) {
    flagReasons.push("Low citation language and low technical density together");
  }

  const lowRetrievalValue = overallNormalized < 0.35 || rejectHeuristics.filter((r) => r.matched).length >= 4;
  const poorCitationValue = citeRaw < 0.1 || rejectHeuristics.find((r) => r.id === "sponsor_heavy")?.matched;
  const weakEducationalDensity =
    explain.raw < 0.12 && actionRaw < 0.1 && specRaw > 0.38;

  const tier: RetrievalQualityTier =
    overallNormalized >= 0.72 ? "A" : overallNormalized >= 0.55 ? "B" : overallNormalized >= 0.38 ? "C" : "D";

  return {
    videoId,
    overallNormalized,
    tier,
    dimensions,
    rejectHeuristics,
    flags: {
      lowRetrievalValue,
      poorCitationValue: Boolean(poorCitationValue),
      weakEducationalDensity,
      reasons: flagReasons,
    },
  };
}
