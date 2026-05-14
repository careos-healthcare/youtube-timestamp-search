export type IndexedTranscriptMatch = {
  start: number;
  timestamp: string;
  snippet: string;
  text: string;
};

export type IndexedTranscriptSearchResult = {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  category?: string;
  topic?: string;
  creatorName?: string;
  score: number;
  matches: IndexedTranscriptMatch[];
  ranking?: HybridRankingBreakdown;
};

export type HybridRankingBreakdown = {
  keywordScore: number;
  semanticScore: number;
  exactPhraseBoost: number;
  metadataBoost: number;
  finalScore: number;
};

export type SemanticSearchHit = {
  videoId: string;
  segmentIndex: number;
  startSeconds: number;
  text: string;
  snippet: string;
  similarity: number;
};

export type HybridSearchDiagnostics = {
  mode: string;
  keywordResultCount: number;
  semanticResultCount: number;
  hybridApplied: boolean;
  semanticFallback: boolean;
};
