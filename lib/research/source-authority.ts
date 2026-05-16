import { CREATOR_DATABASE } from "@/lib/creator-data";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { normalizeText } from "@/lib/youtube";

/** Context label — not a fact-check or endorsement. */
export type SourceAuthorityLabel =
  | "primary_source"
  | "practitioner"
  | "academic_technical"
  | "founder_operator"
  | "tutorial_source"
  | "opinion_heavy"
  | "entertainment_commentary"
  | "unknown_weak_context";

export type SourceAuthorityConfidence = "high" | "medium" | "low";

export type SourceAuthorityResult = {
  sourceAuthorityLabel: SourceAuthorityLabel;
  /** Plain-language heuristic reason (no “verified truth”). */
  sourceAuthorityReason: string;
  sourceAuthorityConfidence: SourceAuthorityConfidence;
};

export const SOURCE_AUTHORITY_UI_LABEL: Record<SourceAuthorityLabel, string> = {
  primary_source: "Primary source",
  practitioner: "Practitioner",
  academic_technical: "Academic / technical",
  founder_operator: "Founder / operator",
  tutorial_source: "Tutorial source",
  opinion_heavy: "Opinion-heavy",
  entertainment_commentary: "Entertainment / commentary",
  unknown_weak_context: "Unknown / weak context",
};

const PRIMARY_CUE =
  /\b(according to|official|documentation|the spec|the standard|rfc|ieee|white paper|paper)\b/i;
const OPINION_CUE =
  /\b(i think|i believe|my guess|probably|maybe|perhaps|imo|in my opinion|feels like|i feel like)\b/i;
const TUTORIAL_CUE = /\b(tutorial|beginner|intro to|getting started|crash course|101|walkthrough|course)\b/i;
const ACADEMIC_CUE =
  /\b(university|mit|stanford|arxiv|professor|lecture|research|paper|empirical|study|benchmark)\b/i;
const FOUNDER_CUE = /\b(ceo|founder|cofounder|co-founder|startup|raised|series [a-z]|vc|pitch)\b/i;
const PODCAST_CUE = /\b(podcast|interview|conversation with|ft\.|featuring)\b/i;

function matchCreatorRecord(channelName?: string) {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return undefined;
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) return c;
    if (c.aliases.some((a) => a.toLowerCase() === ch)) return c;
    if (c.displayName.length > 4 && ch.includes(c.displayName.toLowerCase())) return c;
  }
  return undefined;
}

export type SourceAuthorityInput = {
  channelName?: string;
  videoTitle?: string;
  snippet: string;
  phrase?: string;
  category?: string;
  topic?: string;
};

function haystack(input: SourceAuthorityInput) {
  return normalizeText(
    `${input.videoTitle ?? ""} ${input.snippet} ${input.phrase ?? ""} ${input.channelName ?? ""}`
  ).toLowerCase();
}

/**
 * Heuristic source context from metadata + transcript cues.
 * Does not judge factual correctness.
 */
export function evaluateSourceAuthority(input: SourceAuthorityInput): SourceAuthorityResult {
  const h = haystack(input);
  const title = (input.videoTitle ?? "").toLowerCase();
  const channel = (input.channelName ?? "").trim();
  const creator = matchCreatorRecord(channel);

  let label: SourceAuthorityLabel = "unknown_weak_context";
  const reasons: string[] = [];
  let confidence: SourceAuthorityConfidence = "low";

  if (PRIMARY_CUE.test(h)) {
    label = "primary_source";
    reasons.push("References documentation, standards, or paper-style sources in speech.");
    confidence = "medium";
  } else if (TUTORIAL_CUE.test(h) || title.includes("tutorial") || title.includes("course")) {
    label = "tutorial_source";
    reasons.push("Structured teaching cues in title or excerpt.");
    confidence = "medium";
  } else if (ACADEMIC_CUE.test(h) || /\b(university|institute)\b/i.test(channel)) {
    label = "academic_technical";
    reasons.push("Academic / technical vocabulary or institutional channel cue.");
    confidence = "medium";
  } else if (
    (creator?.category === "entrepreneurship" || creator?.category === "business") &&
    FOUNDER_CUE.test(h)
  ) {
    label = "founder_operator";
    reasons.push("Creator profile + wording suggest operator / business context.");
    confidence = "medium";
  } else if (FOUNDER_CUE.test(h)) {
    label = "founder_operator";
    reasons.push("Founder or fundraising language in title or excerpt.");
    confidence = "low";
  } else if (OPINION_CUE.test(h)) {
    label = "opinion_heavy";
    reasons.push("First-person or hedging language in the excerpt.");
    confidence = "medium";
  } else if (PODCAST_CUE.test(title) || PODCAST_CUE.test(h)) {
    label = "entertainment_commentary";
    reasons.push("Interview or commentary-style packaging — may blend analysis and opinion.");
    confidence = "low";
  } else if (
    creator &&
    (creator.category === "ai" || creator.category === "tech" || creator.category === "education")
  ) {
    label = "practitioner";
    reasons.push("Matched indexed creator profile — practitioner context (not an endorsement).");
    confidence = "medium";
  }

  if (reasons.length === 0) {
    reasons.push("Limited metadata match — treat channel/title as weak context until you listen.");
  }

  return {
    sourceAuthorityLabel: label,
    sourceAuthorityReason: reasons.slice(0, 2).join(" "),
    sourceAuthorityConfidence: confidence,
  };
}

export function evaluateSourceAuthorityForPublicMoment(row: PublicMomentRecord): SourceAuthorityResult {
  return evaluateSourceAuthority({
    channelName: row.channelName,
    videoTitle: row.videoTitle,
    snippet: row.snippet,
    phrase: row.phrase,
    category: row.category,
    topic: row.topic,
  });
}
