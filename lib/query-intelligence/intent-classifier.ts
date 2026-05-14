export type QueryIntent =
  | "definitional"
  | "how_to"
  | "commercial"
  | "comparison"
  | "navigational"
  | "problem_solving"
  | "general";

const COMMERCIAL_PATTERN =
  /\b(best|pricing|price|saas|buy|tool|software|course|certification|review|startup|fundraising|revenue|monetize|affiliate|crm|b2b|enterprise)\b/i;

const COMPARISON_PATTERN = /\b(vs|versus|compare|comparison|alternative|alternatives)\b/i;

const PROBLEM_PATTERN = /\b(fix|error|debug|issue|problem|broken|fails|failure|troubleshoot)\b/i;

export function classifyQueryIntent(phrase: string): QueryIntent {
  const lower = phrase.toLowerCase().trim();

  if (/^(what|who|define|meaning of)\b/.test(lower) || lower.includes("what is")) {
    return "definitional";
  }

  if (/^(how to|how do|how can|tutorial|learn)\b/.test(lower)) {
    return "how_to";
  }

  if (/\b(guide|tutorial|explained|walkthrough|introduction to)\b/.test(lower)) {
    return "how_to";
  }

  if (/\b(market fit|fundraising|pricing|go to market|product strategy)\b/.test(lower)) {
    return "commercial";
  }

  if (COMMERCIAL_PATTERN.test(lower)) {
    return "commercial";
  }

  if (COMPARISON_PATTERN.test(lower)) {
    return "comparison";
  }

  if (PROBLEM_PATTERN.test(lower)) {
    return "problem_solving";
  }

  if (/\b(podcast|interview|episode|lex fridman|joe rogan|huberman)\b/i.test(lower)) {
    return "navigational";
  }

  return "general";
}

export function commercialIntentScore(phrase: string) {
  const lower = phrase.toLowerCase();
  let score = 0;

  if (classifyQueryIntent(phrase) === "commercial") score += 0.55;
  if (/\b(pricing|saas|startup|fundraising|revenue|b2b|enterprise|monetize)\b/.test(lower)) score += 0.25;
  if (/\b(best|top|review|tool|software|course)\b/.test(lower)) score += 0.15;

  return Math.min(score, 1);
}
