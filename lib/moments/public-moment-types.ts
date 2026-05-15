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
  materializedAt?: string;
};

export type PublicMomentsFile = {
  moments: PublicMomentRecord[];
};
