import { normalizeText } from "@/lib/youtube";

import { GENERIC_MOMENT_TOKENS } from "@/lib/moments/public-moment-quality";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "of",
  "to",
  "in",
  "on",
  "for",
  "at",
  "by",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "these",
  "those",
  "we",
  "you",
  "they",
  "i",
  "so",
  "just",
  "really",
  "very",
  "like",
  "about",
  "into",
  "from",
  "with",
  "without",
]);

function tokenize(lower: string) {
  return lower
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ""))
    .filter(Boolean);
}

/** Reject ultra-generic / single-token / stopword-only phrases for semantic moments. */
export function rejectWeakSemanticPhrase(phrase: string): { ok: boolean; reason?: string } {
  const raw = normalizeText(phrase);
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length < 10) return { ok: false, reason: "too_short" };
  if (raw.length > 160) return { ok: false, reason: "too_long" };

  const lower = raw.toLowerCase();
  const words = tokenize(lower);
  if (words.length === 0) return { ok: false, reason: "no_tokens" };

  if (words.length === 1) {
    const w = words[0]!;
    if (w.length < 6 || GENERIC_MOMENT_TOKENS.has(w)) {
      return { ok: false, reason: "weak_single_token" };
    }
    return { ok: false, reason: "single_token_not_allowed" };
  }

  const nonStop = words.filter((w) => !STOP.has(w));
  if (nonStop.length < 2) return { ok: false, reason: "mostly_stopwords" };

  const genericHits = words.filter((w) => GENERIC_MOMENT_TOKENS.has(w));
  if (words.length <= 2 && genericHits.length > 0) {
    return { ok: false, reason: "generic_short_phrase" };
  }
  if (genericHits.length >= Math.ceil(words.length / 2)) {
    return { ok: false, reason: "too_many_generic_tokens" };
  }

  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  if (avgLen < 3.2 && words.length < 4) return { ok: false, reason: "low_lexical_weight" };

  return { ok: true };
}
