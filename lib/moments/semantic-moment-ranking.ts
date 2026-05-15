import { scoreSnippetUsefulness, scorePhraseQuality } from "@/lib/moments/public-moment-quality";
import type { SemanticExtractionKind } from "@/lib/moments/semantic-extractor";
import { CREATOR_DATABASE } from "@/lib/creator-data";
import { normalizeText } from "@/lib/youtube";

export type SemanticRankingSignals = {
  semanticDensity: number;
  transcriptCompleteness: number;
  explanatoryQuality: number;
  technicalSpecificity: number;
  phraseUniqueness: number;
  creatorAuthority: number;
  snippetCoherence: number;
  engagementPrior: number;
  searchIntentLikelihood: number;
};

export type SemanticRankingResult = {
  total: number;
  signals: SemanticRankingSignals;
};

const EXPLANATION_KINDS = new Set<SemanticExtractionKind>([
  "explanation",
  "definition",
  "framework",
  "argument",
  "comparison",
]);

const INTENT_KINDS = new Set<SemanticExtractionKind>([
  "question",
  "definition",
  "comparison",
  "prediction",
  "explanation",
]);

function tokenize(lower: string) {
  return lower
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ""))
    .filter(Boolean);
}

function jaccardUnique(tokens: string[]) {
  const uniq = new Set(tokens);
  return uniq.size / Math.max(1, tokens.length);
}

function pronounDensity(snippet: string) {
  const lower = snippet.toLowerCase();
  const hits = (lower.match(/\b(it|this|that|they|them|there|here)\b/g) ?? []).length;
  const words = lower.split(/\s+/).filter(Boolean).length || 1;
  return hits / words;
}

function resolveCreatorAuthority(channelName?: string): number {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return 0;
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) {
      return c.featured ? 22 : 16;
    }
    if (c.aliases.some((a) => a.toLowerCase() === ch)) {
      return c.featured ? 18 : 14;
    }
    if (ch.includes(c.displayName.toLowerCase()) || c.displayName.toLowerCase().includes(ch)) {
      return c.featured ? 14 : 10;
    }
  }
  return 4;
}

/**
 * Composite ranking for semantic public moments (materialization + future topic pages).
 */
export function scoreSemanticMomentRanking(params: {
  phrase: string;
  snippet: string;
  extractionKinds: SemanticExtractionKind[];
  /** Higher when phrase is rare in this transcript (simple inverse frequency proxy). */
  phraseCorpusFrequency?: number;
  /** Segment count for the source video (engagement / depth proxy). */
  segmentCount?: number;
  channelName?: string;
}): SemanticRankingResult {
  const phrase = normalizeText(params.phrase);
  const snippet = normalizeText(params.snippet);
  const kinds = params.extractionKinds;
  const tokens = tokenize(phrase.toLowerCase());

  const kindBoost = kinds.reduce((s, k) => {
    if (EXPLANATION_KINDS.has(k)) s += 5;
    if (INTENT_KINDS.has(k)) s += 3;
    return s;
  }, 0);

  const semanticDensity = Math.min(28, kindBoost + Math.min(12, Math.floor(tokens.length * 2.2)));

  const phraseQ = scorePhraseQuality(phrase);
  const snippetQ = scoreSnippetUsefulness(snippet, phrase);
  const transcriptCompleteness = snippetQ.ok ? Math.min(26, 10 + snippetQ.score) : 0;

  let explanatoryQuality = 0;
  for (const k of kinds) {
    if (EXPLANATION_KINDS.has(k)) explanatoryQuality += 6;
  }
  explanatoryQuality += Math.min(18, Math.max(0, phraseQ.score * 0.35));

  let technicalSpecificity = 0;
  if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(phrase)) technicalSpecificity += 8;
  if (/\b(api|gpu|cpu|sql|json|http|sdk|llm|rag|kubernetes|docker|postgres)\b/i.test(phrase)) {
    technicalSpecificity += 12;
  }
  technicalSpecificity += Math.min(10, tokens.filter((t) => t.length >= 8).length * 2);

  const corpusFreq = Math.max(1, params.phraseCorpusFrequency ?? 1);
  const phraseUniqueness = Math.min(24, 6 + Math.log1p(1000 / corpusFreq) * 3 + jaccardUnique(tokens) * 10);

  const creatorAuthority = resolveCreatorAuthority(params.channelName);

  const coherencePenalty = pronounDensity(snippet) * 18;
  const snippetCoherence = Math.max(0, 22 - coherencePenalty + (snippet.length > 160 ? 4 : 0));

  const segments = params.segmentCount ?? 0;
  const engagementPrior = Math.min(16, Math.log1p(segments) * 2.2);

  let searchIntentLikelihood = 0;
  for (const k of kinds) {
    if (INTENT_KINDS.has(k)) searchIntentLikelihood += 5;
  }
  if (/\b(what|how|why|when|who|should|could|would)\b/i.test(phrase)) searchIntentLikelihood += 8;
  if (/\b(vs|versus|compared|difference|predict|framework|definition)\b/i.test(phrase)) {
    searchIntentLikelihood += 6;
  }
  searchIntentLikelihood = Math.min(30, searchIntentLikelihood);

  const signals: SemanticRankingSignals = {
    semanticDensity,
    transcriptCompleteness,
    explanatoryQuality,
    technicalSpecificity,
    phraseUniqueness,
    creatorAuthority,
    snippetCoherence,
    engagementPrior: Math.round(engagementPrior * 10) / 10,
    searchIntentLikelihood,
  };

  const total = Object.values(signals).reduce((a, b) => a + b, 0);
  return { total: Math.round(total * 10) / 10, signals };
}
