import { getSearchQuerySeed, phraseFromSearchSlug } from "@/lib/search-query-seeds";
import { normalizeText } from "@/lib/youtube";
import { slugifyQuery } from "@/lib/seo";

const MAX_QUERY_LENGTH = 80;
const MIN_INDEXABLE_MOMENTS = 3;

const SPAM_PATTERNS = [
  /(.)\1{6,}/,
  /^[^a-z0-9]+$/i,
  /\b(viagra|casino|porn|xxx)\b/i,
];

export type ResolvedSearchQuery = {
  rawSlug: string;
  phrase: string;
  canonicalSlug: string;
  canonicalPath: string;
  isPrioritySeed: boolean;
  isValid: boolean;
  shouldIndex: boolean;
  rejectionReason?: string;
};

export function sanitizeSearchPhrase(input: string) {
  return normalizeText(input)
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function isSearchPhraseValid(phrase: string) {
  if (!phrase || phrase.length < 2) {
    return { valid: false, reason: "Query too short" };
  }

  if (phrase.length > MAX_QUERY_LENGTH) {
    return { valid: false, reason: "Query too long" };
  }

  if (SPAM_PATTERNS.some((pattern) => pattern.test(phrase))) {
    return { valid: false, reason: "Query blocked" };
  }

  const words = phrase.split(/\s+/);
  if (words.length > 12) {
    return { valid: false, reason: "Too many terms" };
  }

  return { valid: true as const };
}

export function resolveSearchQuery(rawSlug: string, momentCount = 0): ResolvedSearchQuery {
  const seed = getSearchQuerySeed(rawSlug);
  const phrase = sanitizeSearchPhrase(seed?.phrase ?? phraseFromSearchSlug(rawSlug));
  const validation = isSearchPhraseValid(phrase);
  const canonicalSlug = seed?.slug ?? slugifyQuery(phrase);
  const isPrioritySeed = Boolean(seed);
  const shouldIndex =
    validation.valid &&
    (isPrioritySeed || momentCount >= MIN_INDEXABLE_MOMENTS);

  return {
    rawSlug,
    phrase,
    canonicalSlug,
    canonicalPath: `/search/${canonicalSlug}`,
    isPrioritySeed,
    isValid: validation.valid,
    shouldIndex,
    rejectionReason: validation.valid ? undefined : validation.reason,
  };
}

export function shouldNoIndexSearchPage(resolved: ResolvedSearchQuery) {
  return !resolved.shouldIndex;
}
