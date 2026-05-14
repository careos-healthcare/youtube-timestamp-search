import { classifyQueryIntent } from "@/lib/query-intelligence/intent-classifier";
import { tokenizeQuery } from "@/lib/query-intelligence/query-normalizer";
import { detectEntities } from "@/lib/query-quality/entity-phrase-detector";
import {
  contentTokens,
  isConversationalFillerPhrase,
  isStopwordHeavyBigram,
  stopwordRatio,
  tokenizeAllWords,
} from "@/lib/query-quality/stopword-filter";

const TECHNICAL_VOCABULARY = new Set([
  "api",
  "algorithm",
  "architecture",
  "backend",
  "database",
  "deployment",
  "framework",
  "frontend",
  "infrastructure",
  "kubernetes",
  "microservices",
  "model",
  "neural",
  "optimization",
  "pipeline",
  "protocol",
  "runtime",
  "schema",
  "serverless",
  "vector",
  "workflow",
  "tutorial",
  "framework",
  "protocol",
  "embedding",
  "inference",
  "training",
  "cluster",
  "container",
  "compiler",
  "debugging",
  "authentication",
  "encryption",
]);

export function semanticSpecificityScore(phrase: string) {
  const normalized = phrase.toLowerCase().trim();
  const allTokens = tokenizeAllWords(normalized);
  const content = contentTokens(normalized);
  const meaningful = tokenizeQuery(normalized);

  if (isConversationalFillerPhrase(normalized)) return 0;
  if (isStopwordHeavyBigram(normalized)) return 0.05;

  let score = 0.2;

  if (content.length >= 2) score += 0.25;
  if (content.length >= 3) score += 0.15;
  if (meaningful.length >= 2) score += 0.1;

  const technicalHits = content.filter((token) => TECHNICAL_VOCABULARY.has(token)).length;
  score += Math.min(technicalHits * 0.12, 0.35);

  const entity = detectEntities(normalized);
  score += entity.entityScore * 0.25;

  const intent = classifyQueryIntent(normalized);
  if (intent === "definitional" || intent === "how_to" || intent === "comparison") score += 0.15;
  if (intent === "problem_solving") score += 0.12;
  if (intent === "commercial" && content.length >= 2) score += 0.08;
  if (/^(what is|what are|how to|how do)\b/.test(normalized) && content.length >= 1) score += 0.2;

  score -= stopwordRatio(normalized) * 0.35;
  if (allTokens.length === 1) score -= 0.25;

  return Math.max(0, Math.min(Number(score.toFixed(3)), 1));
}

export function genericLanguagePenalty(phrase: string) {
  const normalized = phrase.toLowerCase().trim();
  if (isConversationalFillerPhrase(normalized)) return 1;
  if (isStopwordHeavyBigram(normalized)) return 0.85;
  return Math.min(stopwordRatio(normalized) * 0.8, 0.75);
}
