import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { evaluateMomentQualitySignals, evaluatePublicMoment, momentQualityRankingKey } from "@/lib/quality";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

import { classifyExplanationFromText } from "./classify-explanation-role";
import type { ResearchAnswerPublic, ResearchAnswerSearch, ResearchExplanationRole } from "./research-answer-types";
import { evaluateSourceAuthority, evaluateSourceAuthorityForPublicMoment } from "./source-authority";

function rationaleFor(role: ResearchExplanationRole, kind: "public" | "search") {
  const base = kind === "public" ? "Public index moment" : "Indexed search hit";
  switch (role) {
    case "best_explanation":
      return `${base} — strongest composite transcript signals for this topic (heuristic).`;
    case "beginner_explanation":
      return `${base} — beginner / definitional wording in the excerpt.`;
    case "technical_explanation":
      return `${base} — technical vocabulary or systems detail in the excerpt.`;
    case "counterpoint_caveat":
      return `${base} — hedging, disagreement, or risk language detected (possible caveat).`;
    case "primary_source_moment":
      return `${base} — references specs, standards, or documentation-style speech (still verify).`;
    case "most_engaged":
      return `${base} — highest local engagement hint when available (not popularity truth).`;
    default:
      return `${base} — ranked by transcript heuristics only.`;
  }
}

function pickUniqueByVideo<T extends { videoId: string }>(rows: T[], used: Set<string>) {
  for (const row of rows) {
    if (used.has(row.videoId)) continue;
    used.add(row.videoId);
    return row;
  }
  return undefined;
}

export function buildResearchAnswerFromPublicMoments(
  queryLabel: string,
  topicSlug: string | undefined,
  moments: PublicMomentRecord[],
  engagementByMomentId?: Record<string, number>
): ResearchAnswerPublic {
  const sorted = [...moments].sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a));
  const usedVideos = new Set<string>();
  const slots: ResearchAnswerPublic["slots"] = {};

  const ranked = sorted.map((m) => ({
    m,
    cls: classifyExplanationFromText({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    }),
    q: evaluatePublicMoment(m),
    auth: evaluateSourceAuthorityForPublicMoment(m),
  }));

  const best = pickUniqueByVideo(
    ranked.map((r) => r.m),
    usedVideos
  );
  if (best) {
    slots.bestExplanation = {
      key: "bestExplanation",
      role: "best_explanation",
      moment: best,
      rationale: rationaleFor("best_explanation", "public"),
      authority: evaluateSourceAuthorityForPublicMoment(best),
    };
  }

  const beginner = pickUniqueByVideo(
    ranked.filter((r) => r.cls.beginnerLikelihood >= 1 || r.cls.tutorialLikelihood >= 0.5).map((r) => r.m),
    usedVideos
  );
  if (beginner) {
    slots.beginnerExplanation = {
      key: "beginnerExplanation",
      role: "beginner_explanation",
      moment: beginner,
      rationale: rationaleFor("beginner_explanation", "public"),
      authority: evaluateSourceAuthorityForPublicMoment(beginner),
    };
  }

  const technical = pickUniqueByVideo(
    ranked.filter((r) => r.cls.technicalLikelihood >= 1).map((r) => r.m),
    usedVideos
  );
  if (technical) {
    slots.technicalExplanation = {
      key: "technicalExplanation",
      role: "technical_explanation",
      moment: technical,
      rationale: rationaleFor("technical_explanation", "public"),
      authority: evaluateSourceAuthorityForPublicMoment(technical),
    };
  }

  const counter = pickUniqueByVideo(
    ranked.filter((r) => r.cls.counterLikelihood >= 1).map((r) => r.m),
    usedVideos
  );
  if (counter) {
    slots.counterpoint = {
      key: "counterpoint",
      role: "counterpoint_caveat",
      moment: counter,
      rationale: rationaleFor("counterpoint_caveat", "public"),
      authority: evaluateSourceAuthorityForPublicMoment(counter),
    };
  }

  const primary = pickUniqueByVideo(
    ranked.filter((r) => r.cls.primarySourceLikelihood >= 1).map((r) => r.m),
    usedVideos
  );
  if (primary) {
    slots.primarySource = {
      key: "primarySource",
      role: "primary_source_moment",
      moment: primary,
      rationale: rationaleFor("primary_source_moment", "public"),
      authority: evaluateSourceAuthorityForPublicMoment(primary),
    };
  }

  if (engagementByMomentId && Object.keys(engagementByMomentId).length > 0) {
    let bestId: string | undefined;
    let bestScore = -1;
    for (const m of sorted) {
      const s = engagementByMomentId[m.id] ?? 0;
      if (s > bestScore) {
        bestScore = s;
        bestId = m.id;
      }
    }
    const row = bestId ? sorted.find((m) => m.id === bestId) : undefined;
    if (row && !usedVideos.has(row.videoId)) {
      usedVideos.add(row.videoId);
      slots.mostEngaged = {
        key: "mostEngaged",
        role: "most_engaged",
        moment: row,
        rationale: rationaleFor("most_engaged", "public"),
        authority: evaluateSourceAuthorityForPublicMoment(row),
      };
    }
  }

  return { queryLabel, topicSlug, slots };
}

export function buildResearchAnswerFromSearchMoments(
  queryLabel: string,
  moments: SearchLandingMoment[]
): ResearchAnswerSearch {
  const sorted = [...moments].sort((a, b) => b.score - a.score);
  const usedVideos = new Set<string>();
  const slots: ResearchAnswerSearch["slots"] = {};

  const ranked = sorted.map((m) => ({
    m,
    cls: classifyExplanationFromText({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
    }),
    q: evaluateMomentQualitySignals({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      channelName: m.channelName,
      materializationScore: m.score,
      startSeconds: m.startSeconds,
    }),
    syntheticMomentId: `${m.videoId}:${Math.round(m.startSeconds)}`,
  }));

  const take = (predicate: (r: (typeof ranked)[number]) => boolean) => {
    const pool = ranked.filter(predicate).map((r) => r.m);
    return pickUniqueByVideo(pool, usedVideos);
  };

  const best = take(() => true);
  if (best) {
    slots.bestExplanation = {
      key: "bestExplanation",
      role: "best_explanation",
      moment: best,
      rationale: rationaleFor("best_explanation", "search"),
      authority: evaluateSourceAuthority({
        channelName: best.channelName,
        videoTitle: best.videoTitle,
        snippet: best.snippet,
        phrase: queryLabel,
      }),
      syntheticMomentId: `${best.videoId}:${Math.round(best.startSeconds)}`,
    };
  }

  const beginner = take((r) => r.cls.beginnerLikelihood >= 1 || r.cls.tutorialLikelihood >= 0.5);
  if (beginner) {
    slots.beginnerExplanation = {
      key: "beginnerExplanation",
      role: "beginner_explanation",
      moment: beginner,
      rationale: rationaleFor("beginner_explanation", "search"),
      authority: evaluateSourceAuthority({
        channelName: beginner.channelName,
        videoTitle: beginner.videoTitle,
        snippet: beginner.snippet,
        phrase: queryLabel,
      }),
      syntheticMomentId: `${beginner.videoId}:${Math.round(beginner.startSeconds)}`,
    };
  }

  const technical = take((r) => r.cls.technicalLikelihood >= 1);
  if (technical) {
    slots.technicalExplanation = {
      key: "technicalExplanation",
      role: "technical_explanation",
      moment: technical,
      rationale: rationaleFor("technical_explanation", "search"),
      authority: evaluateSourceAuthority({
        channelName: technical.channelName,
        videoTitle: technical.videoTitle,
        snippet: technical.snippet,
        phrase: queryLabel,
      }),
      syntheticMomentId: `${technical.videoId}:${Math.round(technical.startSeconds)}`,
    };
  }

  const counter = take((r) => r.cls.counterLikelihood >= 1);
  if (counter) {
    slots.counterpoint = {
      key: "counterpoint",
      role: "counterpoint_caveat",
      moment: counter,
      rationale: rationaleFor("counterpoint_caveat", "search"),
      authority: evaluateSourceAuthority({
        channelName: counter.channelName,
        videoTitle: counter.videoTitle,
        snippet: counter.snippet,
        phrase: queryLabel,
      }),
      syntheticMomentId: `${counter.videoId}:${Math.round(counter.startSeconds)}`,
    };
  }

  const primary = take((r) => r.cls.primarySourceLikelihood >= 1);
  if (primary) {
    slots.primarySource = {
      key: "primarySource",
      role: "primary_source_moment",
      moment: primary,
      rationale: rationaleFor("primary_source_moment", "search"),
      authority: evaluateSourceAuthority({
        channelName: primary.channelName,
        videoTitle: primary.videoTitle,
        snippet: primary.snippet,
        phrase: queryLabel,
      }),
      syntheticMomentId: `${primary.videoId}:${Math.round(primary.startSeconds)}`,
    };
  }

  return { queryLabel, slots };
}
