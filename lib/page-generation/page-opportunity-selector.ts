import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ScoredOpportunity } from "@/lib/query-intelligence/opportunity-scoring";
import { isSpamOrNoisePhrase } from "@/lib/page-generation/page-quality-guard";
import { slugifySearchPhrase, slugifyTopicPhrase } from "@/lib/page-generation/page-slugger";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";

export type PageOpportunity = {
  phrase: string;
  pageType: "search" | "topic";
  opportunityScore: number;
  demand: number;
  zeroResults: number;
  intent: string;
  clusterLabel?: string;
};

export type QueryIntelligenceSnapshot = {
  generatedAt: string;
  opportunities: ScoredOpportunity[];
  topicClustersToIndex: Array<{
    label: string;
    phrases: string[];
    demand: number;
  }>;
};

const DEFAULT_LIMIT = 40;

export function loadQueryIntelligenceSnapshot(): QueryIntelligenceSnapshot | null {
  const jsonPath = join(process.cwd(), "data", "query-intelligence", "opportunities.json");
  if (!existsSync(jsonPath)) return null;

  const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as QueryIntelligenceSnapshot;
  return {
    generatedAt: parsed.generatedAt,
    opportunities: parsed.opportunities ?? [],
    topicClustersToIndex: parsed.topicClustersToIndex ?? [],
  };
}

function existingSearchSlugs() {
  return new Set(PRIORITY_SEARCH_QUERIES.map((seed) => seed.slug));
}

function existingTopicSlugs() {
  return new Set(TOPIC_SEEDS.map((topic) => topic.slug));
}

export function selectSearchOpportunities(
  snapshot: QueryIntelligenceSnapshot,
  limit = DEFAULT_LIMIT
): PageOpportunity[] {
  const existing = existingSearchSlugs();
  const selected: PageOpportunity[] = [];
  const seen = new Set<string>();

  for (const item of snapshot.opportunities) {
    const phrase = item.phrase.trim().toLowerCase();
    const slug = slugifySearchPhrase(phrase);
    if (seen.has(slug) || existing.has(slug) || isSpamOrNoisePhrase(phrase)) continue;

    seen.add(slug);
    selected.push({
      phrase,
      pageType: "search",
      opportunityScore: item.opportunityScore,
      demand: item.demand,
      zeroResults: item.zeroResults,
      intent: item.intent,
    });

    if (selected.length >= limit) break;
  }

  return selected;
}

export function selectTopicOpportunities(
  snapshot: QueryIntelligenceSnapshot,
  limit = 20
): PageOpportunity[] {
  const existing = existingTopicSlugs();
  const selected: PageOpportunity[] = [];
  const seen = new Set<string>();

  for (const cluster of snapshot.topicClustersToIndex) {
    const slug = slugifyTopicPhrase(cluster.label);
    if (seen.has(slug) || existing.has(slug)) continue;

    const representative = cluster.phrases.find((phrase) => !isSpamOrNoisePhrase(phrase));
    if (!representative) continue;

    seen.add(slug);
    selected.push({
      phrase: cluster.label,
      pageType: "topic",
      opportunityScore: cluster.demand,
      demand: cluster.demand,
      zeroResults: 0,
      intent: "topic-cluster",
      clusterLabel: cluster.label,
    });

    if (selected.length >= limit) break;
  }

  return selected;
}

export function selectPageOpportunities(limit = DEFAULT_LIMIT) {
  const snapshot = loadQueryIntelligenceSnapshot();
  if (!snapshot) {
    throw new Error("Missing data/query-intelligence/opportunities.json — run npm run queries:intelligence first.");
  }

  const search = selectSearchOpportunities(snapshot, limit);
  const topics = selectTopicOpportunities(snapshot, Math.min(12, Math.floor(limit / 3)));

  return {
    snapshot,
    opportunities: [...search, ...topics],
    searchOpportunities: search,
    topicOpportunities: topics,
  };
}
