import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import type { SearchLandingMoment } from "@/lib/search/landing-types";

import type { SourceAuthorityResult } from "./source-authority";

/** Heuristic role for grouping “best answer” slots — transcript-backed, not generative. */
export type ResearchExplanationRole =
  | "best_explanation"
  | "beginner_explanation"
  | "technical_explanation"
  | "counterpoint_caveat"
  | "primary_source_moment"
  | "most_engaged";

export type ResearchAnswerSlotKey =
  | "bestExplanation"
  | "beginnerExplanation"
  | "technicalExplanation"
  | "counterpoint"
  | "primarySource"
  | "mostEngaged";

export type ResearchAnswerSlotPublic = {
  key: ResearchAnswerSlotKey;
  role: ResearchExplanationRole;
  moment: PublicMomentRecord;
  /** Short heuristic rationale (no truth claims). */
  rationale: string;
  authority: SourceAuthorityResult;
};

export type ResearchAnswerPublic = {
  queryLabel: string;
  topicSlug?: string;
  slots: Partial<Record<ResearchAnswerSlotKey, ResearchAnswerSlotPublic>>;
};

export type ResearchAnswerSlotSearch = {
  key: ResearchAnswerSlotKey;
  role: ResearchExplanationRole;
  moment: SearchLandingMoment;
  rationale: string;
  authority: SourceAuthorityResult;
  syntheticMomentId: string;
};

export type ResearchAnswerSearch = {
  queryLabel: string;
  slots: Partial<Record<ResearchAnswerSlotKey, ResearchAnswerSlotSearch>>;
};
