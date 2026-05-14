import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { mineHighIntentQueries } from "@/lib/query-mining";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";

import { classifyQueryIntent } from "@/lib/query-intelligence/intent-classifier";
import { clusterQueries } from "@/lib/query-intelligence/query-clustering";
import {
  isUsefulQueryPhrase,
  mergeQueryKey,
  normalizeQueryPhrase,
  tokenizeQuery,
} from "@/lib/query-intelligence/query-normalizer";
import {
  isJunkPhrase,
  passesOpportunityQuality,
  scorePhraseQuality,
} from "@/lib/query-quality/phrase-quality-score";
import {
  rankOpportunities,
  type OpportunityInput,
  type ScoredOpportunity,
} from "@/lib/query-intelligence/opportunity-scoring";

export type QuerySignalRecord = {
  phrase: string;
  demand: number;
  zeroResults: number;
  clicks: number;
  feedbackYes: number;
  feedbackNo: number;
  sources: string[];
};

export type QueryIntelligenceReport = {
  generatedAt: string;
  analyticsSource: "supabase" | "high-intent-fallback" | "mixed";
  indexedVideosScanned: number;
  corpusPhraseCount: number;
  topSearchDemand: ScoredOpportunity[];
  zeroResultOpportunities: ScoredOpportunity[];
  highClickQueries: ScoredOpportunity[];
  badResultQueries: ScoredOpportunity[];
  topicClustersToIndex: ReturnType<typeof clusterQueries>;
  pagesToCreateNext: ScoredOpportunity[];
  ingestRecommendations: Array<{ label: string; reason: string; score: number }>;
  commercialOpportunities: ScoredOpportunity[];
  opportunities: ScoredOpportunity[];
};

type MutableSignal = QuerySignalRecord & {
  corpusHits: number;
  recentEvents: number;
};

const SEARCH_EVENTS = [
  "search_query",
  "homepage_search",
  "search_submitted",
  "indexed_transcript_search",
  "extension_video_search",
] as const;

const ZERO_EVENTS = ["search_zero_results", "no_results"] as const;
const CLICK_EVENTS = [
  "youtube_timestamp_click",
  "youtube_open",
  "result_click",
  "search_result_click",
] as const;

async function loadSupabaseSignals() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("search_analytics_events")
    .select("event_name, query, video_id, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !data) return null;
  return data;
}

function bumpSignal(
  map: Map<string, MutableSignal>,
  phrase: string,
  patch: Partial<MutableSignal> & { source?: string }
) {
  if (!isUsefulQueryPhrase(phrase)) return;
  if (isJunkPhrase(phrase)) return;
  if (patch.source === "indexed-transcript" && !passesOpportunityQuality(phrase)) return;

  const key = mergeQueryKey(phrase);
  const existing = map.get(key) ?? {
    phrase: normalizeQueryPhrase(phrase),
    demand: 0,
    zeroResults: 0,
    clicks: 0,
    feedbackYes: 0,
    feedbackNo: 0,
    sources: [],
    corpusHits: 0,
    recentEvents: 0,
  };

  existing.demand += patch.demand ?? 0;
  existing.zeroResults += patch.zeroResults ?? 0;
  existing.clicks += patch.clicks ?? 0;
  existing.feedbackYes += patch.feedbackYes ?? 0;
  existing.feedbackNo += patch.feedbackNo ?? 0;
  existing.corpusHits += patch.corpusHits ?? 0;
  existing.recentEvents += patch.recentEvents ?? 0;

  if (patch.source && !existing.sources.includes(patch.source)) {
    existing.sources.push(patch.source);
  }

  map.set(key, existing);
}

async function loadFallbackSeedSignals(map: Map<string, MutableSignal>) {
  const reportPath = join(process.cwd(), "HIGH_INTENT_QUERY_REPORT.md");
  if (existsSync(reportPath)) {
    const mined = await mineHighIntentQueries();
    for (const bucket of [
      mined.likelyHighVolume,
      mined.lowCompetitionLongTail,
      mined.questionStyle,
      mined.zeroResultSearches,
      mined.internalSearches,
    ]) {
      for (const item of bucket) {
        if (!isUsefulQueryPhrase(item.phrase)) continue;
        bumpSignal(map, item.phrase, {
          demand: Math.min(item.score, 30),
          zeroResults: item.sources.includes("zero-result-search") ? 2 : 0,
          source: "high-intent-report",
        });
      }
    }
    return "high-intent-fallback" as const;
  }

  for (const seed of PRIORITY_SEARCH_QUERIES) {
    bumpSignal(map, seed.phrase, { demand: 8, source: "priority-seed" });
  }
  return "high-intent-fallback" as const;
}

async function loadCorpusSignals(map: Map<string, MutableSignal>) {
  const summaries = await listCachedTranscripts();
  const scanLimit = Math.min(summaries.length, 80);
  const phraseCounts = new Map<string, number>();

  for (const summary of summaries.slice(0, scanLimit)) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached) continue;

    for (const segment of cached.segments) {
      const words = tokenizeQuery(segment.text);
      for (let index = 0; index < words.length - 1; index += 1) {
        const bigram = `${words[index]} ${words[index + 1]}`;
        if (!isUsefulQueryPhrase(bigram)) continue;
        phraseCounts.set(bigram, (phraseCounts.get(bigram) ?? 0) + 1);
      }
    }
  }

  for (const [phrase, count] of phraseCounts.entries()) {
    if (count < 6) continue;
    if (!passesOpportunityQuality(phrase)) continue;
    bumpSignal(map, phrase, {
      corpusHits: count,
      demand: Math.min(count, 12),
      source: "indexed-transcript",
    });
  }

  return { scanLimit, corpusPhraseCount: phraseCounts.size };
}

function existingCoverageScore(phrase: string, map: Map<string, MutableSignal>) {
  const key = mergeQueryKey(phrase);
  const signal = map.get(key);
  let coverage = 0;

  if (PRIORITY_SEARCH_QUERIES.some((seed) => mergeQueryKey(seed.phrase) === key)) {
    coverage += 0.55;
  }

  if (signal?.corpusHits && signal.corpusHits >= 6) {
    coverage += 0.35;
  } else if (signal?.corpusHits && signal.corpusHits >= 2) {
    coverage += 0.15;
  }

  if (TOPIC_SEEDS.some((topic) => normalizeQueryPhrase(topic.displayName) === key)) {
    coverage += 0.2;
  }

  return Math.min(coverage, 1);
}

function topicDepthGapScore(phrase: string, clusters: ReturnType<typeof clusterQueries>) {
  const cluster = clusters.find((entry) => entry.phrases.some((item) => mergeQueryKey(item) === mergeQueryKey(phrase)));
  if (!cluster) return 0.2;
  return cluster.phrases.length >= 5 ? 0.75 : cluster.phrases.length >= 3 ? 0.45 : 0.2;
}

function freshnessBoostScore(signal: MutableSignal) {
  if (signal.recentEvents <= 0) return 0;
  return Math.min(signal.recentEvents / 10, 1);
}

function toOpportunityInputs(
  map: Map<string, MutableSignal>,
  clusters: ReturnType<typeof clusterQueries>
): OpportunityInput[] {
  return [...map.values()]
    .map((signal) => {
      const existingCoverage = existingCoverageScore(signal.phrase, map);
      const quality = scorePhraseQuality(signal.phrase, { existingCoverage });
      return {
        phrase: signal.phrase,
        demand: signal.demand,
        zeroResults: signal.zeroResults,
        clicks: signal.clicks,
        feedbackYes: signal.feedbackYes,
        feedbackNo: signal.feedbackNo,
        existingCoverage,
        topicDepthGap: topicDepthGapScore(signal.phrase, clusters),
        freshnessBoost: freshnessBoostScore(signal),
        intent: classifyQueryIntent(signal.phrase),
        phraseQuality: quality.qualityScore,
      };
    })
    .filter((input) => !isJunkPhrase(input.phrase) && (input.phraseQuality ?? 0) >= 0.35);
}

function buildIngestRecommendations(opportunities: ScoredOpportunity[]) {
  const recommendations: Array<{ label: string; reason: string; score: number }> = [];

  for (const creator of CREATOR_SEEDS.slice(0, 12)) {
    const related = opportunities.filter((item) =>
      item.phrase.includes(creator.displayName.toLowerCase()) ||
      creator.popularTopics.some((topic) => item.phrase.includes(topic.toLowerCase()))
    );
    if (related.length > 0) {
      recommendations.push({
        label: creator.displayName,
        reason: `${related.length} high-opportunity queries map to this creator/channel`,
        score: related.reduce((sum, item) => sum + item.opportunityScore, 0),
      });
    }
  }

  for (const cluster of clusterQueries(
    opportunities.slice(0, 40).map((item) => ({ phrase: item.phrase, demand: item.demand }))
  ).slice(0, 8)) {
    recommendations.push({
      label: cluster.label,
      reason: `Topic cluster with ${cluster.phrases.length} related demand signals`,
      score: cluster.demand,
    });
  }

  return recommendations
    .sort((left, right) => right.score - left.score)
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.label.toLowerCase() === item.label.toLowerCase()) === index
    )
    .slice(0, 15);
}

export async function buildQueryIntelligenceReport(): Promise<QueryIntelligenceReport> {
  const map = new Map<string, MutableSignal>();
  let analyticsSource: QueryIntelligenceReport["analyticsSource"] = "high-intent-fallback";

  const rows = await loadSupabaseSignals();
  if (rows) {
    analyticsSource = "supabase";
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const phrase = row.query?.trim();
      if (!phrase) continue;
      const recent = row.created_at ? new Date(row.created_at).getTime() >= weekAgo : false;

      if (SEARCH_EVENTS.includes(row.event_name as (typeof SEARCH_EVENTS)[number])) {
        bumpSignal(map, phrase, {
          demand: 1,
          recentEvents: recent ? 1 : 0,
          source: "analytics-search",
        });
      }

      if (ZERO_EVENTS.includes(row.event_name as (typeof ZERO_EVENTS)[number])) {
        bumpSignal(map, phrase, {
          zeroResults: 1,
          demand: 1,
          recentEvents: recent ? 1 : 0,
          source: "analytics-zero-result",
        });
      }

      if (CLICK_EVENTS.includes(row.event_name as (typeof CLICK_EVENTS)[number])) {
        bumpSignal(map, phrase, {
          clicks: 1,
          demand: 1,
          recentEvents: recent ? 1 : 0,
          source: "analytics-click",
        });
      }

      if (row.event_name === "result_feedback") {
        const payload = row.payload as Record<string, unknown> | null;
        const helpful = payload?.helpful === true || payload?.helpful === "true";
        bumpSignal(map, phrase, {
          feedbackYes: helpful ? 1 : 0,
          feedbackNo: helpful ? 0 : 1,
          source: "analytics-feedback",
        });
      }
    }
  } else {
    analyticsSource = await loadFallbackSeedSignals(map);
  }

  if (map.size < 20) {
    await loadFallbackSeedSignals(map);
    analyticsSource = rows ? "mixed" : analyticsSource;
  }

  const corpus = await loadCorpusSignals(map);
  const demandEntries = [...map.values()].map((signal) => ({
    phrase: signal.phrase,
    demand: signal.demand + signal.clicks,
  }));
  const clusters = clusterQueries(demandEntries);
  const opportunities = rankOpportunities(toOpportunityInputs(map, clusters));

  return {
    generatedAt: new Date().toISOString(),
    analyticsSource,
    indexedVideosScanned: corpus.scanLimit,
    corpusPhraseCount: corpus.corpusPhraseCount,
    topSearchDemand: opportunities.slice(0, 25),
    zeroResultOpportunities: opportunities
      .filter((item) => item.zeroResults > 0)
      .slice(0, 20),
    highClickQueries: [...opportunities]
      .sort((left, right) => right.clicks - left.clicks)
      .filter((item) => item.clicks > 0)
      .slice(0, 20),
    badResultQueries: opportunities
      .filter((item) => item.feedbackNo > item.feedbackYes)
      .slice(0, 20),
    topicClustersToIndex: clusters.slice(0, 15),
    pagesToCreateNext: opportunities
      .filter((item) => item.existingCoverage < 0.45)
      .slice(0, 20),
    ingestRecommendations: buildIngestRecommendations(opportunities),
    commercialOpportunities: opportunities
      .filter((item) => item.commercialIntent >= 0.4 || item.intent === "commercial")
      .slice(0, 20),
    opportunities: opportunities.slice(0, 100),
  };
}

export function formatQueryIntelligenceMarkdown(report: QueryIntelligenceReport) {
  const table = (items: ScoredOpportunity[]) => {
    if (items.length === 0) return "_No candidates yet._\n";
    const rows = items
      .map(
        (item, index) =>
          `| ${index + 1} | ${item.phrase.replace(/\|/g, "\\|")} | ${item.opportunityScore.toFixed(1)} | ${item.demand} | ${item.zeroResults} | ${item.clicks} | ${item.intent} |`
      )
      .join("\n");
    return `| Rank | Query | Opportunity | Demand | Zero | Clicks | Intent |\n|------|-------|------------:|-------:|-----:|-------:|--------|\n${rows}\n`;
  };

  const clusterSection = report.topicClustersToIndex
    .map(
      (cluster, index) =>
        `${index + 1}. **${cluster.label}** — ${cluster.phrases.length} related queries (demand ${cluster.demand})`
    )
    .join("\n");

  const ingestSection = report.ingestRecommendations
    .map((item, index) => `${index + 1}. **${item.label}** — ${item.reason} (score ${item.score.toFixed(1)})`)
    .join("\n");

  return `# Query Intelligence Report

Generated: ${report.generatedAt}
Analytics source: ${report.analyticsSource}
Indexed videos scanned: ${report.indexedVideosScanned}
Corpus phrase candidates: ${report.corpusPhraseCount}

## Top search demand

${table(report.topSearchDemand)}

## Zero-result opportunities

${table(report.zeroResultOpportunities)}

## High-click queries

${table(report.highClickQueries)}

## Bad-result queries

${table(report.badResultQueries)}

## New topic clusters to index

${clusterSection || "_No clusters yet._"}

## Pages to create next

${table(report.pagesToCreateNext)}

## Videos/channels to ingest next

${ingestSection || "_No ingest recommendations yet._"}

## Revenue/commercial-intent opportunities

${table(report.commercialOpportunities)}

## Regenerate

\`\`\`bash
npm run queries:intelligence
\`\`\`

Machine-readable output: \`data/query-intelligence/opportunities.json\`
`;
}

export function loadHighIntentReportFallbackPhrases() {
  const reportPath = join(process.cwd(), "HIGH_INTENT_QUERY_REPORT.md");
  if (!existsSync(reportPath)) return [] as string[];
  const content = readFileSync(reportPath, "utf8");
  return [...content.matchAll(/^\| \d+ \| ([^|]+) \|/gm)]
    .map((match) => match[1]?.trim().toLowerCase())
    .filter((phrase): phrase is string => Boolean(phrase) && isUsefulQueryPhrase(phrase));
}
