import type { SemanticRankingSignals } from "@/lib/moments/semantic-moment-ranking";
import type { SemanticTopicLabeling } from "@/lib/moments/semantic-moment-topics";
import type { SemanticMomentCitations } from "@/lib/moments/semantic-moment-citations";
import type { SemanticExtractionKind } from "@/lib/moments/semantic-extractor";

/** Optional enrichment for `/moment/[id]/[slug]`, citations, and future `/topic/[slug]`. */
export type PublicMomentSemanticLayer = {
  extractionKinds: SemanticExtractionKind[];
  rankingSignals: SemanticRankingSignals;
  totalSemanticRank: number;
  topics: SemanticTopicLabeling;
  citations: SemanticMomentCitations;
};

export type PublicMomentRecord = {
  id: string;
  videoId: string;
  phrase: string;
  canonicalSlug: string;
  startSeconds: number;
  timestamp: string;
  snippet: string;
  youtubeUrl: string;
  videoTitle?: string;
  channelName?: string;
  /** Indexed transcript category slug when known. */
  category?: string;
  topic?: string;
  qualityScore?: number;
  materializedAt?: string;
  /** Semantic pipeline output (backward-compatible optional field). */
  semantic?: PublicMomentSemanticLayer;
};

export type PublicMomentsFile = {
  moments: PublicMomentRecord[];
};
