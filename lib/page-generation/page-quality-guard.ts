import { resolveSearchQuery } from "@/lib/search-query-guard";
import { tokenizeQuery } from "@/lib/query-intelligence/query-normalizer";
import {
  isJunkPhrase,
  passesPageGenerationQuality,
  scorePhraseQuality,
} from "@/lib/query-quality/phrase-quality-score";
import { slugifySearchPhrase, slugifyTopicPhrase } from "@/lib/page-generation/page-slugger";

export const MIN_INDEXABLE_MOMENTS = 3;
export const MIN_CONFIDENCE_MOMENTS = 1;
export const MIN_PAGE_OPPORTUNITY_SCORE = 35;

export type PageQualityInput = {
  phrase: string;
  pageType: "search" | "topic";
  momentCount: number;
  videoCount: number;
  opportunityScore: number;
  existingSlugs: Set<string>;
  existingCoverage?: number;
};

export type PageQualityResult = {
  accepted: boolean;
  noindex: boolean;
  thinContent: boolean;
  qualityScore: number;
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
  return isJunkPhrase(phrase);
}

export function evaluatePageQuality(input: PageQualityInput): PageQualityResult {
  const phrase = input.phrase.trim().toLowerCase();
  const quality = scorePhraseQuality(phrase, { existingCoverage: input.existingCoverage ?? 0 });
  const canonicalSlug =
    input.pageType === "search" ? slugifySearchPhrase(phrase) : slugifyTopicPhrase(phrase);
  const canonicalPath = input.pageType === "search" ? `/search/${canonicalSlug}` : `/topic/${canonicalSlug}`;

  if (isJunkPhrase(phrase) || !passesPageGenerationQuality(phrase, input.existingCoverage ?? 0)) {
    return {
      accepted: false,
      noindex: true,
      thinContent: true,
      qualityScore: quality.qualityScore,
      rejectionReason: "Low-quality or filler phrase rejected",
      canonicalSlug,
      canonicalPath,
    };
  }

  const resolved = resolveSearchQuery(slugifySearchPhrase(phrase), input.momentCount);
  if (!resolved.isValid) {
    return {
      accepted: false,
      noindex: true,
      thinContent: true,
      qualityScore: quality.qualityScore,
      rejectionReason: resolved.rejectionReason ?? "Invalid search phrase",
      canonicalSlug,
      canonicalPath,
    };
  }

  if (input.existingSlugs.has(canonicalSlug)) {
    return {
      accepted: false,
      noindex: true,
      thinContent: false,
      qualityScore: quality.qualityScore,
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
        qualityScore: quality.qualityScore,
        rejectionReason: "Duplicate intent suppressed",
        canonicalSlug,
        canonicalPath,
      };
    }
  }

  const thinContent = input.momentCount < MIN_INDEXABLE_MOMENTS;
  const noindex = thinContent || quality.qualityScore < 0.5;
  const accepted =
    input.momentCount >= MIN_CONFIDENCE_MOMENTS &&
    !thinContent &&
    input.videoCount > 0 &&
    input.opportunityScore >= MIN_PAGE_OPPORTUNITY_SCORE &&
    passesPageGenerationQuality(phrase, input.existingCoverage ?? 0);

  return {
    accepted,
    noindex,
    thinContent,
    qualityScore: quality.qualityScore,
    rejectionReason: accepted
      ? undefined
      : thinContent
        ? `Thin page: ${input.momentCount} moments (minimum ${MIN_INDEXABLE_MOMENTS})`
        : "Insufficient quality or corpus coverage",
    canonicalSlug,
    canonicalPath,
  };
}

export function shouldIncludeInSitemap(result: PageQualityResult) {
  return result.accepted && !result.noindex && !result.thinContent;
}
