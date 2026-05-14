import { normalizeText } from "@/lib/youtube";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "because",
  "before",
  "but",
  "can",
  "could",
  "for",
  "from",
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
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "video",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
  "would",
  "you",
  "your",
  "youtube",
]);

export function normalizeQueryPhrase(phrase: string) {
  return normalizeText(phrase).toLowerCase();
}

export function tokenizeQuery(phrase: string) {
  return normalizeQueryPhrase(phrase)
    .split(/[^a-z0-9'-]+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function isUsefulQueryPhrase(phrase: string) {
  const normalized = normalizeQueryPhrase(phrase);
  if (normalized.length < 3) return false;
  const tokens = tokenizeQuery(normalized);
  if (tokens.length === 0) return false;
  if (tokens.length === 1 && tokens[0].length < 4) return false;
  return true;
}

export function mergeQueryKey(phrase: string) {
  return normalizeQueryPhrase(phrase);
}

export function queryOverlap(left: string, right: string) {
  const leftTokens = new Set(tokenizeQuery(left));
  const rightTokens = tokenizeQuery(right);
  if (leftTokens.size === 0 || rightTokens.length === 0) return 0;
  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.length);
}
