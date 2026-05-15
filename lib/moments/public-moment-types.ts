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
};

export type PublicMomentsFile = {
  moments: PublicMomentRecord[];
};
