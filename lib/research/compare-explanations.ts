import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { evaluateMomentQualitySignals, momentQualityRankingKey } from "@/lib/quality";

import { classifyExplanationFromText } from "./classify-explanation-role";
import { evaluateSourceAuthority, evaluateSourceAuthorityForPublicMoment, type SourceAuthorityResult } from "./source-authority";

export type CompareFraming = "beginner" | "technical" | "opinion" | "tutorial" | "caveat";

export type CompareExplanationPublicRow = {
  moment: PublicMomentRecord;
  authority: SourceAuthorityResult;
  qualityTier: "high" | "medium" | "low";
  framing: CompareFraming;
  differentiation: string;
};

export type CompareExplanationSearchRow = {
  moment: SearchLandingMoment;
  syntheticMomentId: string;
  authority: SourceAuthorityResult;
  qualityTier: "high" | "medium" | "low";
  framing: CompareFraming;
  differentiation: string;
};

function framingFromClassification(c: ReturnType<typeof classifyExplanationFromText>): CompareFraming {
  if (c.counterLikelihood >= 1) return "caveat";
  if (c.opinionLikelihood >= 1) return "opinion";
  if (c.tutorialLikelihood >= 1 || c.beginnerLikelihood >= 1) return "tutorial";
  if (c.technicalLikelihood >= 1) return "technical";
  if (c.beginnerLikelihood > c.technicalLikelihood) return "beginner";
  return "technical";
}

function differentiationLabel(framing: CompareFraming) {
  switch (framing) {
    case "beginner":
      return "Beginner-oriented framing";
    case "technical":
      return "Technical / systems framing";
    case "opinion":
      return "Opinion or speculation-heavy";
    case "tutorial":
      return "Tutorial / walkthrough style";
    case "caveat":
      return "Possible caveat or counterpoint";
    default:
      return "Mixed framing";
  }
}

/** Pick diverse creators/videos for side-by-side comparison (public index). */
export function comparePublicMomentsForTopic(
  moments: PublicMomentRecord[],
  queryLabel: string,
  maxRows: number
): CompareExplanationPublicRow[] {
  const sorted = [...moments].sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a));
  const out: CompareExplanationPublicRow[] = [];
  const usedVideos = new Set<string>();

  for (const m of sorted) {
    if (out.length >= maxRows) break;
    if (usedVideos.has(m.videoId)) continue;
    const cls = classifyExplanationFromText({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    });
    const framing = framingFromClassification(cls);
    const authority = evaluateSourceAuthorityForPublicMoment(m);
    const q = evaluateMomentQualitySignals({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      channelName: m.channelName,
      materializationScore: m.qualityScore,
      startSeconds: m.startSeconds,
      semanticRank: m.semantic?.totalSemanticRank,
      extractionKinds: m.semantic?.extractionKinds,
    });
    out.push({
      moment: m,
      authority,
      qualityTier: q.qualityTier,
      framing,
      differentiation: differentiationLabel(framing),
    });
    usedVideos.add(m.videoId);
  }

  return out;
}

/** Compare explanations for search landing (live index moments). */
export function compareSearchMoments(phrase: string, moments: SearchLandingMoment[], maxRows: number) {
  const sorted = [...moments].sort((a, b) => b.score - a.score);
  const out: CompareExplanationSearchRow[] = [];
  const usedVideos = new Set<string>();

  for (const m of sorted) {
    if (out.length >= maxRows) break;
    if (usedVideos.has(m.videoId)) continue;
    const cls = classifyExplanationFromText({
      phrase,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
    });
    const framing = framingFromClassification(cls);
    const authority = evaluateSourceAuthority({
      channelName: m.channelName,
      videoTitle: m.videoTitle,
      snippet: m.snippet,
      phrase,
    });
    const q = evaluateMomentQualitySignals({
      phrase,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      channelName: m.channelName,
      materializationScore: m.score,
      startSeconds: m.startSeconds,
    });
    const syntheticMomentId = `${m.videoId}:${Math.round(m.startSeconds)}`;
    out.push({
      moment: m,
      syntheticMomentId,
      authority,
      qualityTier: q.qualityTier,
      framing,
      differentiation: differentiationLabel(framing),
    });
    usedVideos.add(m.videoId);
  }

  return out;
}

/** Lexicographic tie-break for stable tests — prefers higher quality then earlier phrase. */
export function compareExplanationRankingKeyPublic(a: CompareExplanationPublicRow, b: CompareExplanationPublicRow) {
  const tierRank = (t: string) => (t === "high" ? 2 : t === "medium" ? 1 : 0);
  const d = tierRank(b.qualityTier) - tierRank(a.qualityTier);
  if (d !== 0) return d;
  return momentQualityRankingKey(b.moment) - momentQualityRankingKey(a.moment);
}
