import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { normalizeText } from "@/lib/youtube";

export type VideoExplanationProfile = {
  videoId: string;
  videoTitle: string;
  channelName?: string;
  matchCount: number;
  topSnippet: string;
  complexity: "beginner" | "mixed" | "advanced";
};

export type MultiVideoSynthesis = {
  query: string;
  consensusExplanation: string | null;
  recurringThemes: string[];
  disagreements: string[];
  bestExamples: Array<{ videoId: string; title: string; snippet: string }>;
  bestBeginnerSource: VideoExplanationProfile | null;
  bestAdvancedSource: VideoExplanationProfile | null;
  videoProfiles: VideoExplanationProfile[];
};

const THEME_STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "could",
  "first",
  "from",
  "have",
  "just",
  "like",
  "more",
  "really",
  "that",
  "their",
  "there",
  "they",
  "this",
  "very",
  "what",
  "when",
  "with",
  "would",
  "your",
]);

function tokenize(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !THEME_STOPWORDS.has(token));
}

function sentenceKey(text: string) {
  return normalizeText(text).toLowerCase().slice(0, 120);
}

function overlapRatio(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = tokenize(right);
  if (leftTokens.size === 0 || rightTokens.length === 0) return 0;
  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.length);
}

function classifyComplexity(snippet: string): VideoExplanationProfile["complexity"] {
  const lower = snippet.toLowerCase();
  const advancedHits = /\b(algorithm|architecture|implementation|protocol|inference|gradient|tensor|kernel|deployment)\b/.test(
    lower
  );
  const beginnerHits = /\b(basically|simply|introduction|overview|beginner|what is|means|easy)\b/.test(lower);
  if (advancedHits && !beginnerHits) return "advanced";
  if (beginnerHits && !advancedHits) return "beginner";
  return "mixed";
}

function buildVideoProfiles(moments: SearchLandingMoment[]) {
  const byVideo = new Map<string, SearchLandingMoment[]>();
  for (const moment of moments) {
    const bucket = byVideo.get(moment.videoId) ?? [];
    bucket.push(moment);
    byVideo.set(moment.videoId, bucket);
  }

  return [...byVideo.entries()].map(([videoId, videoMoments]) => {
    const top = [...videoMoments].sort((left, right) => right.score - left.score)[0];
    return {
      videoId,
      videoTitle: top.videoTitle,
      channelName: top.channelName,
      matchCount: videoMoments.length,
      topSnippet: top.snippet,
      complexity: classifyComplexity(top.snippet),
    } satisfies VideoExplanationProfile;
  });
}

export function synthesizeMultiVideoAnswer(query: string, moments: SearchLandingMoment[]): MultiVideoSynthesis {
  const videoProfiles = buildVideoProfiles(moments).sort((left, right) => right.matchCount - left.matchCount);
  const snippets = moments.map((moment) => moment.snippet).slice(0, 12);

  const themeCounts = new Map<string, number>();
  for (const snippet of snippets) {
    for (const token of tokenize(snippet)) {
      themeCounts.set(token, (themeCounts.get(token) ?? 0) + 1);
    }
  }

  const recurringThemes = [...themeCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([token]) => token);

  const uniqueSnippets = [...new Set(snippets.map(sentenceKey))];
  const consensusPairs: string[] = [];
  const disagreementPairs: string[] = [];

  for (let index = 0; index < uniqueSnippets.length; index += 1) {
    for (let inner = index + 1; inner < uniqueSnippets.length; inner += 1) {
      const ratio = overlapRatio(uniqueSnippets[index], uniqueSnippets[inner]);
      if (ratio >= 0.45) consensusPairs.push(uniqueSnippets[index]);
      if (ratio > 0.1 && ratio < 0.25) disagreementPairs.push(uniqueSnippets[index]);
    }
  }

  const consensusExplanation =
    consensusPairs[0] ??
    (videoProfiles[0]?.topSnippet.length >= 40 ? videoProfiles[0].topSnippet.slice(0, 280) : null);

  const bestBeginnerSource =
    videoProfiles.find((profile) => profile.complexity === "beginner") ??
    videoProfiles.find((profile) => profile.complexity === "mixed") ??
    videoProfiles[0] ??
    null;

  const bestAdvancedSource =
    videoProfiles.find((profile) => profile.complexity === "advanced") ??
    [...videoProfiles].sort((left, right) => right.matchCount - left.matchCount)[0] ??
    null;

  return {
    query,
    consensusExplanation,
    recurringThemes,
    disagreements: [...new Set(disagreementPairs)].slice(0, 4),
    bestExamples: videoProfiles.slice(0, 4).map((profile) => ({
      videoId: profile.videoId,
      title: profile.videoTitle,
      snippet: profile.topSnippet.slice(0, 220),
    })),
    bestBeginnerSource,
    bestAdvancedSource,
    videoProfiles,
  };
}
