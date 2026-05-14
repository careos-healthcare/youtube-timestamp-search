import { resolveSearchQuery } from "@/lib/search-query-guard";
import { tokenizeQuery } from "@/lib/query-intelligence/query-normalizer";
import { slugifySearchPhrase, slugifyTopicPhrase } from "@/lib/page-generation/page-slugger";

const CORPUS_NOISE_TOKENS = new Set([
  "data",
  "does",
  "it's",
  "let's",
  "right",
  "know",
  "some",
  "that's",
  "want",
  "we're",
  "more",
  "what's",
  "can't",
  "thing",
  "things",
  "really",
  "going",
  "think",
  "people",
  "because",
  "actually",
  "something",
  "little",
  "maybe",
  "pretty",
  "always",
  "never",
  "don't",
  "i'm",
  "you're",
  "they're",
  "there's",
  "course",
  "line",
  "piece",
  "types",
  "taking",
  "learning",
  "throughout",
  "later",
  "different",
  "hardware",
  "application",
  "building",
  "software",
  "system",
]);

const CORPUS_NOISE_PHRASES = new Set([
  "does not",
  "how does",
  "how much",
  "how many",
  "can actually",
  "what's the",
  "can make",
  "best way",
  "line best",
  "best fit",
  "best distance",
  "course course",
  "course i'm",
  "course let's",
  "course going",
  "course it's",
  "course don't",
  "taking course",
  "learning course",
  "throughout course",
  "later course",
  "piece software",
  "types software",
  "software application",
  "software building",
  "hardware software",
  "different software",
  "system software",
]);

export const MIN_INDEXABLE_MOMENTS = 3;
export const MIN_CONFIDENCE_MOMENTS = 1;

export type PageQualityInput = {
  phrase: string;
  pageType: "search" | "topic";
  momentCount: number;
  videoCount: number;
  opportunityScore: number;
  existingSlugs: Set<string>;
};

export type PageQualityResult = {
  accepted: boolean;
  noindex: boolean;
  thinContent: boolean;
  rejectionReason?: string;
  canonicalSlug: string;
  canonicalPath: string;
};

function duplicateIntentScore(left: string, right: string) {
  const leftTokens = new Set(tokenizeQuery(left));
  const rightTokens = tokenizeQuery(right);
  if (leftTokens.size === 0 || rightTokens.length === 0) return 0;
  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.length);
}

export function isSpamOrNoisePhrase(phrase: string) {
  const normalized = phrase.trim().toLowerCase();
  if (CORPUS_NOISE_PHRASES.has(normalized)) return true;

  const tokens = tokenizeQuery(normalized);
  if (tokens.length === 0) return true;
  if (tokens.some((token) => CORPUS_NOISE_TOKENS.has(token))) return true;
  if (tokens.length === 1 && tokens[0].length < 5) return true;
  if (tokens.length < 2 && !/^(what|how|why)\b/.test(normalized)) return true;

  const resolved = resolveSearchQuery(slugifySearchPhrase(normalized), 0);
  return !resolved.isValid;
}

export function evaluatePageQuality(input: PageQualityInput): PageQualityResult {
  const phrase = input.phrase.trim().toLowerCase();
  const canonicalSlug =
    input.pageType === "search" ? slugifySearchPhrase(phrase) : slugifyTopicPhrase(phrase);
  const canonicalPath = input.pageType === "search" ? `/search/${canonicalSlug}` : `/topic/${canonicalSlug}`;

  if (isSpamOrNoisePhrase(phrase)) {
    return {
      accepted: false,
      noindex: true,
      thinContent: true,
      rejectionReason: "Spam or corpus noise phrase",
      canonicalSlug,
      canonicalPath,
    };
  }

  if (input.existingSlugs.has(canonicalSlug)) {
    return {
      accepted: false,
      noindex: true,
      thinContent: false,
      rejectionReason: "Duplicate slug already indexed",
      canonicalSlug,
      canonicalPath,
    };
  }

  for (const existing of input.existingSlugs) {
    const existingPhrase = existing.replace(/-/g, " ");
    if (duplicateIntentScore(phrase, existingPhrase) >= 0.85) {
      return {
        accepted: false,
        noindex: true,
        thinContent: false,
        rejectionReason: "Duplicate intent suppressed",
        canonicalSlug,
        canonicalPath,
      };
    }
  }

  const thinContent = input.momentCount < MIN_INDEXABLE_MOMENTS;
  const noindex = thinContent && input.opportunityScore < 45;
  const accepted =
    input.momentCount >= MIN_CONFIDENCE_MOMENTS &&
    !thinContent &&
    input.videoCount > 0 &&
    input.opportunityScore >= 20;

  return {
    accepted,
    noindex,
    thinContent,
    rejectionReason: accepted
      ? undefined
      : thinContent
        ? `Thin page: ${input.momentCount} moments (minimum ${MIN_INDEXABLE_MOMENTS})`
        : "Insufficient corpus coverage",
    canonicalSlug,
    canonicalPath,
  };
}

export function shouldIncludeInSitemap(result: PageQualityResult) {
  return result.accepted && !result.noindex && !result.thinContent;
}
