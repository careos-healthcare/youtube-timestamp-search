export type SearchLandingMoment = {
  videoId: string;
  videoTitle: string;
  channelName?: string;
  timestamp: string;
  startSeconds: number;
  snippet: string;
  momentPath: string;
  youtubeUrl: string;
  videoPath: string;
  score: number;
  ranking?: {
    keywordScore: number;
    semanticScore: number;
    exactPhraseBoost: number;
    metadataBoost: number;
    finalScore: number;
  };
};
