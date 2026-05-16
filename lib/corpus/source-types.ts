/** Curated corpus / ingestion taxonomy — not YouTube API types. */

export type SourceAllowlistCategory =
  | "ai_research"
  | "ml_engineering"
  | "backend_devops"
  | "programming_tutorials"
  | "startup_founder"
  | "university_lectures"
  | "conference_talks";

export type CorpusSourceType =
  | "youtube_channel"
  | "youtube_playlist"
  | "podcast_feed"
  | "conference_archive"
  | "university_course";

export type TrustTier = "high" | "medium" | "low";

/** One curated row in `data/source-allowlists/*.json`. */
export type AllowlistSourceEntry = {
  channelName: string;
  /** UC… id when known; else null and match by normalized name. */
  channelId: string | null;
  category: SourceAllowlistCategory;
  sourceType: CorpusSourceType;
  trustTier: TrustTier;
  /** 0–1 heuristic prior for explanation-dense long-form. */
  explanationDensityEstimate: number;
  /** 0–1 heuristic prior for cite-able speech patterns. */
  citationLikelihood: number;
  /** 0–100 relative queue priority when tied on score. */
  ingestPriority: number;
  notes: string;
  enabled: boolean;
};

export type SourceAllowlistFile = {
  version: 1;
  /** File-level category (redundant with each row; used for validation). */
  category: SourceAllowlistCategory;
  sources: AllowlistSourceEntry[];
};

export type IngestionRecommendation = "promote" | "candidate" | "reject";

export type IngestionSourceTier = "A" | "B" | "C" | "D";

export type IngestionSourceScoreResult = {
  score: number;
  tier: IngestionSourceTier;
  reasons: string[];
  penalties: string[];
  ingestRecommendation: IngestionRecommendation;
};

export type CorpusQueueName = "high_priority" | "candidate" | "rejected" | "requested";

export type CorpusQueueItem = {
  id: string;
  /** Stable dedupe key: channel id, or normalized channel URL, or video id. */
  dedupeKey: string;
  url?: string;
  channelName?: string;
  channelId?: string | null;
  category?: SourceAllowlistCategory | string;
  sourceType?: CorpusSourceType | string;
  score?: number;
  tier?: IngestionSourceTier;
  reasons?: string[];
  createdAt: string;
  updatedAt?: string;
  /** When promoted from user request flow. */
  requestedSurface?: string;
  indexedVideoId?: string;
  notes?: string;
};

export type CorpusQueueFile = {
  version: 1;
  updatedAt: string;
  items: CorpusQueueItem[];
};
