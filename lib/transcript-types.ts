export type TranscriptLine = {
  text: string;
  start: number;
  duration: number;
};

export type SearchResult = {
  start: number;
  timestamp: string;
  snippet: string;
  openUrl: string;
  highlightTerms: string[];
  pageUrl: string;
};
