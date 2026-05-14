import { normalizeQueryPhrase } from "@/lib/query-intelligence/query-normalizer";

export const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "so",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "to",
  "with",
  "about",
  "after",
  "also",
  "are",
  "because",
  "before",
  "can",
  "could",
  "have",
  "here",
  "how",
  "just",
  "like",
  "not",
  "now",
  "our",
  "say",
  "see",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "when",
  "where",
  "which",
  "will",
  "would",
  "you",
  "your",
  "what",
  "who",
  "why",
  "video",
  "youtube",
]);

export const CONVERSATIONAL_FILLER = new Set([
  "actually",
  "basically",
  "literally",
  "obviously",
  "probably",
  "really",
  "simply",
  "totally",
  "yeah",
  "okay",
  "right",
  "know",
  "some",
  "want",
  "more",
  "does",
  "data",
  "what's",
  "can't",
  "that's",
  "we're",
  "let's",
  "it's",
  "don't",
  "i'm",
  "thing",
  "things",
  "something",
  "anything",
  "everything",
  "someone",
  "everyone",
  "people",
  "going",
  "think",
  "maybe",
  "pretty",
  "little",
  "always",
  "never",
  "kind",
  "sort",
  "lot",
]);

export const CONVERSATIONAL_FILLER_PHRASES = new Set([
  "does not",
  "how does",
  "how much",
  "how many",
  "can actually",
  "what's the",
  "can make",
  "best way",
  "line best",
  "going work",
  "find out",
  "more time",
  "second thing",
  "let's go",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "a lot",
  "right now",
  "over here",
  "over there",
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
  "best fit",
  "best distance",
  "course course",
  "course we'll",
  "course first",
  "course need",
  "whole course",
  "course use",
  "crash course",
]);

export function tokenizeAllWords(phrase: string) {
  return normalizeQueryPhrase(phrase)
    .split(/[^a-z0-9'-]+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
}

export function contentTokens(phrase: string) {
  return tokenizeAllWords(phrase).filter(
    (token) => token.length >= 3 && !FUNCTION_WORDS.has(token) && !CONVERSATIONAL_FILLER.has(token)
  );
}

export function stopwordRatio(phrase: string) {
  const tokens = tokenizeAllWords(phrase);
  if (tokens.length === 0) return 1;
  const stopCount = tokens.filter((token) => FUNCTION_WORDS.has(token) || CONVERSATIONAL_FILLER.has(token)).length;
  return stopCount / tokens.length;
}

export function isConversationalFillerPhrase(phrase: string) {
  const normalized = normalizeQueryPhrase(phrase);
  if (CONVERSATIONAL_FILLER_PHRASES.has(normalized)) return true;

  const tokens = tokenizeAllWords(normalized);
  if (tokens.length === 0) return true;
  if (tokens.length === 1 && CONVERSATIONAL_FILLER.has(tokens[0])) return true;
  if (tokens.every((token) => FUNCTION_WORDS.has(token) || CONVERSATIONAL_FILLER.has(token))) return true;

  const content = contentTokens(normalized);
  if (content.length === 0) return true;
  if (tokens.length === 2 && content.length === 1 && stopwordRatio(normalized) >= 0.5) return true;
  if (/\b(i'm|don't|it's|let's|can't|that's|we're|you're|they're|there's)\b/.test(normalized)) return true;

  return false;
}

export function isStopwordHeavyBigram(phrase: string) {
  const tokens = tokenizeAllWords(phrase);
  if (tokens.length !== 2) return false;
  const content = contentTokens(phrase);
  return content.length <= 1 && stopwordRatio(phrase) >= 0.5;
}
