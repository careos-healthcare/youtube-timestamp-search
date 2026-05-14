import { mergeQueryKey, queryOverlap } from "@/lib/query-intelligence/query-normalizer";
import {
  isJunkPhrase,
  passesOpportunityQuality,
  scorePhraseQuality,
  type PhraseQualityResult,
} from "@/lib/query-quality/phrase-quality-score";
import { detectEntities } from "@/lib/query-quality/entity-phrase-detector";
import { contentTokens } from "@/lib/query-quality/stopword-filter";

export type QueryAnalyticsInsight = {
  queryEntropy: number;
  duplicateIntentGroups: Array<{ canonical: string; collapsed: string[]; count: number }>;
  emergingEntities: Array<{ entity: string; phrases: string[]; score: number }>;
  risingSearches: Array<{ phrase: string; demand: number; freshnessBoost: number; qualityScore: number }>;
};

export type QueryQualityReport = {
  generatedAt: string;
  evaluatedPhrases: number;
  junkFiltered: number;
  highQualityCount: number;
  ambiguousCount: number;
  averageQualityScore: number;
  topQualityPhrases: PhraseQualityResult[];
  filteredJunkExamples: PhraseQualityResult[];
  analytics: QueryAnalyticsInsight;
};

function shannonEntropy(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 0;
  return -values
    .filter((value) => value > 0)
    .reduce((sum, value) => {
      const probability = value / total;
      return sum + probability * Math.log2(probability);
    }, 0);
}

function buildDuplicateIntentGroups(phrases: Array<{ phrase: string; demand: number }>) {
  const groups: Array<{ canonical: string; collapsed: string[]; count: number }> = [];
  const used = new Set<string>();

  for (const entry of phrases) {
    const key = mergeQueryKey(entry.phrase);
    if (used.has(key)) continue;

    const collapsed = phrases
      .filter((candidate) => queryOverlap(entry.phrase, candidate.phrase) >= 0.85)
      .map((candidate) => candidate.phrase);

    if (collapsed.length > 1) {
      for (const phrase of collapsed) used.add(mergeQueryKey(phrase));
      groups.push({
        canonical: entry.phrase,
        collapsed,
        count: collapsed.length,
      });
    }
  }

  return groups.sort((left, right) => right.count - left.count).slice(0, 15);
}

function buildEmergingEntities(phrases: Array<{ phrase: string; demand: number }>) {
  const entityMap = new Map<string, { phrases: string[]; score: number }>();

  for (const entry of phrases) {
    const detection = detectEntities(entry.phrase);
    for (const entity of [...detection.matchedEntities, ...detection.creatorMatches]) {
      const existing = entityMap.get(entity) ?? { phrases: [], score: 0 };
      existing.phrases.push(entry.phrase);
      existing.score += entry.demand;
      entityMap.set(entity, existing);
    }
  }

  return [...entityMap.entries()]
    .map(([entity, value]) => ({
      entity,
      phrases: [...new Set(value.phrases)].slice(0, 5),
      score: value.score,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 15);
}

export function buildQueryQualityReport(
  entries: Array<{
    phrase: string;
    demand?: number;
    freshnessBoost?: number;
    existingCoverage?: number;
  }>
): QueryQualityReport {
  const scored = entries.map((entry) =>
    scorePhraseQuality(entry.phrase, { existingCoverage: entry.existingCoverage ?? 0 })
  );

  const junkFiltered = scored.filter((item) => item.isJunk).length;
  const highQuality = scored.filter((item) => item.isHighQuality);
  const ambiguous = scored.filter((item) => item.isAmbiguous);
  const demandWeighted = entries.map((entry) => entry.demand ?? 1);

  const risingSearches = entries
    .map((entry, index) => ({
      phrase: entry.phrase,
      demand: entry.demand ?? 0,
      freshnessBoost: entry.freshnessBoost ?? 0,
      qualityScore: scored[index]?.qualityScore ?? 0,
    }))
    .filter((entry) => entry.freshnessBoost > 0 && passesOpportunityQuality(entry.phrase))
    .sort((left, right) => right.freshnessBoost - left.freshnessBoost || right.demand - left.demand)
    .slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    evaluatedPhrases: scored.length,
    junkFiltered,
    highQualityCount: highQuality.length,
    ambiguousCount: ambiguous.length,
    averageQualityScore:
      scored.length > 0
        ? Number((scored.reduce((sum, item) => sum + item.qualityScore, 0) / scored.length).toFixed(3))
        : 0,
    topQualityPhrases: [...highQuality].sort((left, right) => right.qualityScore - left.qualityScore).slice(0, 25),
    filteredJunkExamples: scored.filter((item) => item.isJunk).slice(0, 25),
    analytics: {
      queryEntropy: Number(shannonEntropy(demandWeighted).toFixed(3)),
      duplicateIntentGroups: buildDuplicateIntentGroups(
        entries.map((entry) => ({ phrase: entry.phrase, demand: entry.demand ?? 0 }))
      ),
      emergingEntities: buildEmergingEntities(
        entries.map((entry) => ({ phrase: entry.phrase, demand: entry.demand ?? 0 }))
      ),
      risingSearches,
    },
  };
}

export function formatQueryQualityMarkdown(report: QueryQualityReport) {
  const qualityTable = report.topQualityPhrases
    .map(
      (item, index) =>
        `| ${index + 1} | ${item.phrase.replace(/\|/g, "\\|")} | ${item.qualityScore.toFixed(2)} | ${item.intent} | ${item.breakdown.educationalValue.toFixed(2)} | ${item.breakdown.entityDetection.toFixed(2)} |`
    )
    .join("\n");

  const junkTable = report.filteredJunkExamples
    .map(
      (item, index) =>
        `| ${index + 1} | ${item.phrase.replace(/\|/g, "\\|")} | ${item.qualityScore.toFixed(2)} | ${item.breakdown.genericLanguagePenalty.toFixed(2)} |`
    )
    .join("\n");

  const duplicateSection = report.analytics.duplicateIntentGroups
    .map(
      (group, index) =>
        `${index + 1}. **${group.canonical}** — collapsed ${group.count} intents (${group.collapsed.slice(0, 4).join(", ")})`
    )
    .join("\n");

  const entitySection = report.analytics.emergingEntities
    .map((item, index) => `${index + 1}. **${item.entity}** — score ${item.score} (${item.phrases.join(", ")})`)
    .join("\n");

  const risingSection = report.analytics.risingSearches
    .map(
      (item, index) =>
        `${index + 1}. **${item.phrase}** — freshness ${item.freshnessBoost.toFixed(2)}, demand ${item.demand}, quality ${item.qualityScore.toFixed(2)}`
    )
    .join("\n");

  return `# Query Quality Report

Generated: ${report.generatedAt}
Evaluated phrases: ${report.evaluatedPhrases}
Junk filtered: ${report.junkFiltered}
High-quality phrases: ${report.highQualityCount}
Ambiguous phrases: ${report.ambiguousCount}
Average quality score: ${report.averageQualityScore}

## Top quality phrases

| Rank | Phrase | Quality | Intent | Educational | Entity |
|------|--------|--------:|--------|------------:|-------:|
${qualityTable || "| — | — | — | — | — | — |"}

## Filtered junk examples

| Rank | Phrase | Quality | Generic penalty |
|------|--------|--------:|----------------:|
${junkTable || "| — | — | — | — |"}

## Analytics insights

### Query entropy
${report.analytics.queryEntropy} (higher = more diverse demand distribution)

### Duplicate intent collapse
${duplicateSection || "_No duplicate intent groups detected._"}

### Emerging entity detection
${entitySection || "_No emerging entities detected._"}

### Rising searches
${risingSection || "_No rising searches with quality filters applied._"}

## Regenerate

\`\`\`bash
npm run queries:intelligence
npm run queries:validate-quality
\`\`\`
`;
}

export function isPhraseExpectedJunk(phrase: string) {
  return isJunkPhrase(phrase);
}

export function hasMeaningfulContent(phrase: string) {
  return contentTokens(phrase).length >= 2;
}
