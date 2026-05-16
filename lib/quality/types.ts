/** Heuristic tier — not factual truth about the clip. */
export type MomentQualityTier = "high" | "medium" | "low";

/** Serializable output for UI + analytics (no functions). */
export type MomentQualityEvaluation = {
  /** 0–100 composite heuristic score (distinct from stored `qualityScore` on materialized rows). */
  qualityScore: number;
  qualityTier: MomentQualityTier;
  /** Short human-readable labels (1–3 recommended in UI). */
  signals: string[];
  /** Caveats / uncertainty. */
  warnings: string[];
  /** Bullet lines for “Why this moment?” expander. */
  whyThisRanks: string[];
  /** Internal ordering key (materialization + topic hub + related). */
  rankingKey: number;
};

export type MomentQualityInput = {
  phrase: string;
  snippet: string;
  videoTitle?: string;
  channelName?: string;
  category?: string;
  topic?: string;
  /** Stored materialization score when available (typically 30–220 scale). */
  materializationScore?: number;
  startSeconds?: number;
  /** Semantic pipeline rank when present. */
  semanticRank?: number;
  extractionKinds?: string[];
  /** Optional client-only engagement hint (saved/citation frequency); default 0 on server. */
  engagementBoost?: number;
};
