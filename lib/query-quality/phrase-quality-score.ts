import { commercialIntentScore, classifyQueryIntent } from "@/lib/query-intelligence/intent-classifier";
import { detectEntities } from "@/lib/query-quality/entity-phrase-detector";
import {
  genericLanguagePenalty,
  semanticSpecificityScore,
} from "@/lib/query-quality/semantic-specificity";
import {
  contentTokens,
  isConversationalFillerPhrase,
  isStopwordHeavyBigram,
} from "@/lib/query-quality/stopword-filter";

export type PhraseQualityBreakdown = {
  specificity: number;
  topicality: number;
  educationalValue: number;
  commercialValue: number;
  searchLikeStructure: number;
  entityDetection: number;
  novelty: number;
  genericLanguagePenalty: number;
};

export type PhraseQualityResult = {
  phrase: string;
  qualityScore: number;
  isHighQuality: boolean;
  isJunk: boolean;
  isAmbiguous: boolean;
  intent: ReturnType<typeof classifyQueryIntent>;
  breakdown: PhraseQualityBreakdown;
};

export const MIN_HIGH_QUALITY_SCORE = 0.42;
export const MIN_PAGE_GENERATION_QUALITY = 0.55;
export const MIN_OPPORTUNITY_QUALITY = 0.4;

const SEARCH_STRUCTURE_PATTERN =
  /^(what is|what are|who is|how to|how do|how can|why does|why is|best|top|vs|versus|compare|tutorial|learn|guide|framework|tool|course)\b/i;

function topicalityScore(phrase: string) {
  const content = contentTokens(phrase);
  const entity = detectEntities(phrase);
  let score = Math.min(content.length / 4, 0.45);
  score += Math.min(entity.topicMatches.length * 0.12, 0.35);
  score += Math.min(entity.creatorMatches.length * 0.1, 0.2);
  return Math.min(score, 1);
}

function educationalValueScore(phrase: string) {
  const intent = classifyQueryIntent(phrase);
  if (intent === "definitional") return 0.9;
  if (intent === "how_to") return 0.85;
  if (intent === "problem_solving") return 0.8;
  if (intent === "comparison") return 0.75;
  if (intent === "commercial" && contentTokens(phrase).length >= 2) return 0.55;
  if (intent === "navigational") return 0.5;
  return 0.2;
}

function searchLikeStructureScore(phrase: string) {
  const lower = phrase.toLowerCase().trim();
  let score = 0;
  if (SEARCH_STRUCTURE_PATTERN.test(lower)) score += 0.65;
  if (/^(what is|what are|who is|how to|how do|how can|why does|why is)\b/.test(lower)) score += 0.35;
  if (/\?$/.test(lower)) score += 0.15;
  if (/\b(vs|versus|compare|tutorial|framework|tool|course|guide|explained|meaning)\b/.test(lower)) {
    score += 0.2;
  }
  if (contentTokens(lower).length >= 2) score += 0.1;
  if (contentTokens(lower).length === 1 && /^(what is|how to)\b/.test(lower)) score += 0.2;
  return Math.min(score, 1);
}

function noveltyScore(existingCoverage = 0) {
  return Math.max(0, 1 - existingCoverage);
}

export function scorePhraseQuality(
  phrase: string,
  options?: { existingCoverage?: number }
): PhraseQualityResult {
  const normalized = phrase.trim().toLowerCase();
  const specificity = semanticSpecificityScore(normalized);
  const topicality = topicalityScore(normalized);
  const educationalValue = educationalValueScore(normalized);
  const commercialValue = commercialIntentScore(normalized);
  const searchLikeStructure = searchLikeStructureScore(normalized);
  const entityDetection = detectEntities(normalized).entityScore;
  const novelty = noveltyScore(options?.existingCoverage ?? 0);
  const genericPenalty = genericLanguagePenalty(normalized);

  const qualityScore = Math.max(
    0,
    Number(
      (
        specificity * 0.22 +
        topicality * 0.14 +
        educationalValue * 0.2 +
        commercialValue * 0.1 +
        searchLikeStructure * 0.16 +
        entityDetection * 0.12 +
        novelty * 0.06 -
        genericPenalty * 0.35 +
        (SEARCH_STRUCTURE_PATTERN.test(normalized) ? 0.08 : 0)
      ).toFixed(3)
    )
  );

  const isJunk =
    isConversationalFillerPhrase(normalized) ||
    isStopwordHeavyBigram(normalized) ||
    qualityScore < 0.2;
  const isAmbiguous = !isJunk && qualityScore >= 0.3 && qualityScore < MIN_HIGH_QUALITY_SCORE;
  const isHighQuality = !isJunk && qualityScore >= MIN_HIGH_QUALITY_SCORE;

  return {
    phrase: normalized,
    qualityScore,
    isHighQuality,
    isJunk,
    isAmbiguous,
    intent: classifyQueryIntent(normalized),
    breakdown: {
      specificity,
      topicality,
      educationalValue,
      commercialValue,
      searchLikeStructure,
      entityDetection,
      novelty,
      genericLanguagePenalty: genericPenalty,
    },
  };
}

export function isHighQualitySearchPhrase(phrase: string, existingCoverage = 0) {
  return scorePhraseQuality(phrase, { existingCoverage }).isHighQuality;
}

export function isJunkPhrase(phrase: string) {
  return scorePhraseQuality(phrase).isJunk;
}

export function passesPageGenerationQuality(phrase: string, existingCoverage = 0) {
  const result = scorePhraseQuality(phrase, { existingCoverage });
  return !result.isJunk && result.qualityScore >= MIN_PAGE_GENERATION_QUALITY;
}

export function passesOpportunityQuality(phrase: string, existingCoverage = 0) {
  const result = scorePhraseQuality(phrase, { existingCoverage });
  return !result.isJunk && result.qualityScore >= MIN_OPPORTUNITY_QUALITY;
}
