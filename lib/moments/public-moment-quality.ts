import { normalizeText } from "@/lib/youtube";

/** Single-token and ultra-generic phrases to reject from public moment materialization. */
export const GENERIC_MOMENT_TOKENS = new Set([
  "going",
  "just",
  "here",
  "right",
  "know",
  "more",
  "does",
  "data",
  "really",
  "well",
  "like",
  "thing",
  "things",
  "want",
  "make",
  "take",
  "come",
  "good",
  "bad",
  "need",
  "look",
  "got",
  "get",
  "way",
  "now",
  "say",
  "said",
  "think",
  "thought",
  "lot",
  "little",
  "back",
  "even",
  "only",
  "also",
  "much",
  "very",
  "still",
  "something",
  "anything",
  "nothing",
  "people",
  "someone",
  "everyone",
  "because",
  "about",
  "into",
  "through",
  "those",
  "these",
  "there",
  "their",
  "would",
  "could",
  "should",
  "being",
  "doing",
  "first",
  "next",
  "then",
  "than",
  "when",
  "where",
  "which",
  "while",
  "without",
  "within",
]);

const TECH_BONUS = new Set([
  "mongodb",
  "postgres",
  "kubernetes",
  "docker",
  "react",
  "typescript",
  "javascript",
  "python",
  "api",
  "graphql",
  "sql",
  "redis",
  "kafka",
  "aws",
  "gcp",
  "azure",
  "llm",
  "model",
  "training",
  "inference",
  "embedding",
  "vector",
  "database",
  "server",
  "client",
  "frontend",
  "backend",
]);

export type PhraseQualityResult = {
  score: number;
  reasons: string[];
};

export function scorePhraseQuality(phrase: string): PhraseQualityResult {
  const reasons: string[] = [];
  const raw = normalizeText(phrase).trim();
  if (!raw) {
    return { score: -100, reasons: ["empty"] };
  }

  const lower = raw.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  let score = 0;

  if (words.length === 1) {
    const w = words[0]!;
    if (w.length < 5 || GENERIC_MOMENT_TOKENS.has(w)) {
      return { score: -80, reasons: ["single_short_or_generic_word"] };
    }
  }

  if (/\bwhat\s+is\b/i.test(raw) || /\bwhat\s+are\b/i.test(raw)) {
    score += 28;
    reasons.push("what_is_pattern");
  }
  if (/\bhow\s+to\b/i.test(raw)) {
    score += 26;
    reasons.push("how_to_pattern");
  }
  if (/\?$/.test(raw)) {
    score += 10;
    reasons.push("question_form");
  }
  if (/\d/.test(raw)) {
    score += 6;
    reasons.push("contains_digit");
  }

  const genericHits = words.filter((w) => GENERIC_MOMENT_TOKENS.has(w));
  if (genericHits.length > 0) {
    const penalty = words.length <= 2 ? 35 : genericHits.length * 10;
    score -= penalty;
    reasons.push(`generic_tokens:${genericHits.slice(0, 4).join(",")}`);
  }

  score += Math.min(words.length * 5, 22);
  reasons.push(`words:${words.length}`);

  const avgLen =
    words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;
  if (avgLen >= 6) {
    score += 12;
    reasons.push("longer_lexical_units");
  }

  if (/[A-Z][a-z]{2,}/.test(phrase)) {
    score += 8;
    reasons.push("mixed_case_entity_hint");
  }

  for (const term of TECH_BONUS) {
    if (lower.includes(term)) {
      score += 6;
      reasons.push(`tech_term:${term}`);
      break;
    }
  }

  if (raw.length < 8) {
    score -= 25;
    reasons.push("phrase_too_short");
  }

  return { score, reasons };
}

export type SnippetQualityResult = {
  ok: boolean;
  score: number;
  reason?: string;
};

const MIN_SNIPPET_CHARS = 88;

export function scoreSnippetUsefulness(snippet: string, phrase: string): SnippetQualityResult {
  const s = normalizeText(snippet);
  const p = normalizeText(phrase).toLowerCase();

  if (s.length < MIN_SNIPPET_CHARS) {
    return { ok: false, score: 0, reason: `snippet_under_${MIN_SNIPPET_CHARS}_chars` };
  }

  if (p.length >= 4) {
    const inSnippet = s.toLowerCase().includes(p);
    const significant = p
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9']/g, ""))
      .filter((w) => w.length >= 4)
      .slice(0, 3);

    const matchCount = significant.filter((w) => s.toLowerCase().includes(w)).length;
    if (!inSnippet && matchCount === 0) {
      return { ok: false, score: 0, reason: "phrase_not_reflected_in_snippet" };
    }
  }

  const lenScore = Math.min(14, Math.floor((s.length - MIN_SNIPPET_CHARS) / 25));
  return { ok: true, score: 8 + lenScore };
}

export type MomentQualityGate = {
  pass: boolean;
  totalScore: number;
  phrase: PhraseQualityResult;
  snippet: SnippetQualityResult;
};

/** Combined gate for materializing a public moment row. */
export function evaluateMomentMaterialization(
  phrase: string,
  snippet: string,
  minTotal = 20
): MomentQualityGate {
  const phraseQ = scorePhraseQuality(phrase);
  const snippetQ = scoreSnippetUsefulness(snippet, phrase);
  const total = phraseQ.score + (snippetQ.ok ? snippetQ.score : -40);
  const pass = snippetQ.ok && total >= minTotal && phraseQ.score > -50;
  return { pass, totalScore: total, phrase: phraseQ, snippet: snippetQ };
}
