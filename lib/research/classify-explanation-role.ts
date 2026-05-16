import { normalizeText } from "@/lib/youtube";

import type { ResearchExplanationRole } from "./research-answer-types";

const BEGINNER_RE =
  /\b(basically|simply|in other words|introduction|beginner|overview|what is|means|101|getting started)\b/i;
const TECH_RE =
  /\b(algorithm|architecture|implementation|protocol|api|model|training|inference|stack|framework|scheduler|pod|container)\b/i;
const COUNTER_RE =
  /\b(however|but|on the other hand|caveat|risk|downside|myth|misconception|disagree|controvers|watch out)\b/i;
const PRIMARY_RE = /\b(according to|official|documentation|the spec|the standard|rfc|paper)\b/i;
const OPINION_RE =
  /\b(i think|i believe|my guess|probably|maybe|perhaps|imo|in my opinion|feels like|i feel like)\b/i;
const TUTORIAL_RE = /\b(step|walkthrough|demo|let's build|tutorial|exercise)\b/i;

export type ExplanationClassification = {
  /** Primary slot hint for this clip. */
  primary: ResearchExplanationRole | null;
  beginnerLikelihood: number;
  technicalLikelihood: number;
  counterLikelihood: number;
  primarySourceLikelihood: number;
  opinionLikelihood: number;
  tutorialLikelihood: number;
};

function score(re: RegExp, text: string) {
  return re.test(text) ? 1 : 0;
}

export function classifyExplanationFromText(input: {
  phrase: string;
  snippet: string;
  videoTitle?: string;
  extractionKinds?: string[];
}): ExplanationClassification {
  const text = normalizeText(`${input.snippet} ${input.videoTitle ?? ""} ${input.phrase}`).toLowerCase();
  const kinds = input.extractionKinds ?? [];

  const beginnerLikelihood = score(BEGINNER_RE, text) + (kinds.includes("definition") ? 0.4 : 0);
  const technicalLikelihood = score(TECH_RE, text) + (kinds.includes("framework") ? 0.35 : 0);
  const counterLikelihood = score(COUNTER_RE, text) + (kinds.includes("argument") ? 0.35 : 0);
  const primarySourceLikelihood = score(PRIMARY_RE, text);
  const opinionLikelihood = score(OPINION_RE, text);
  const tutorialLikelihood = score(TUTORIAL_RE, text) + (kinds.includes("explanation") ? 0.25 : 0);

  let primary: ResearchExplanationRole | null = null;
  const scores: Array<{ role: ResearchExplanationRole; s: number }> = [
    { role: "counterpoint_caveat", s: counterLikelihood },
    { role: "primary_source_moment", s: primarySourceLikelihood },
    { role: "beginner_explanation", s: beginnerLikelihood },
    { role: "technical_explanation", s: technicalLikelihood },
  ];
  scores.sort((a, b) => b.s - a.s);
  if (scores[0] && scores[0].s >= 0.5) {
    primary = scores[0].role;
  } else if (tutorialLikelihood >= 0.5) {
    primary = "beginner_explanation";
  } else if (technicalLikelihood >= 0.5) {
    primary = "technical_explanation";
  } else if (opinionLikelihood >= 0.5) {
    primary = "best_explanation";
  } else {
    primary = "best_explanation";
  }

  return {
    primary,
    beginnerLikelihood,
    technicalLikelihood,
    counterLikelihood,
    primarySourceLikelihood,
    opinionLikelihood,
    tutorialLikelihood,
  };
}
