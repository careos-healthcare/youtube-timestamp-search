/**
 * Curated flagship topics promoted on homepage / research paths.
 * Governance only — no automatic ingestion.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { STATIC_PUBLIC_COLLECTIONS } from "@/lib/collections/static-collections";
import { loadAllAllowlistEntries } from "@/lib/corpus/source-allowlists";
import { buildMissingCorpusReport } from "@/lib/corpus/missing-corpus";
import { buildTopicCoverageReport, type TopicCoverageRow } from "@/lib/corpus/topic-coverage";
import { loadWave1PlanFile, type Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { comparePublicMomentsForTopic } from "@/lib/research/compare-explanations";
import { hybridSearchTranscripts } from "@/lib/search/hybrid-search-engine";
import { getTopicHubBySlug } from "@/lib/topics/topic-index";
import { START_HERE_CHIPS } from "@/lib/onboarding-start-topics";

export type FlagshipCoverageStatus = "healthy" | "weak" | "broken";

export type FlagshipTopicMinimums = {
  /** Distinct videos in corpus matching this flagship topic. */
  minIndexedVideos: number;
  minUniqueCreators: number;
  minCitationRichMoments: number;
  /** Distinct videos in compare-explanations picker (framing diversity). */
  minCompareableExplanations: number;
  /** Live hybrid search moments (production search path). */
  minSearchResults: number;
  minSemanticMoments: number;
};

export type FlagshipPromotionSurface =
  | "homepage_example_search"
  | "homepage_example_topic"
  | "homepage_example_collection"
  | "start_here_chip"
  | "trending_link";

export type FlagshipTopicDefinition = {
  id: string;
  label: string;
  primaryQuery: string;
  aliases: string[];
  topicHubSlugs: string[];
  collectionSlugs: string[];
  homepagePromoted: boolean;
  promotionSurfaces: FlagshipPromotionSurface[];
  minimums: FlagshipTopicMinimums;
};

/** Default trust minimums for homepage-promoted flagship topics. */
export const FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS: FlagshipTopicMinimums = {
  minIndexedVideos: 2,
  minUniqueCreators: 2,
  minCitationRichMoments: 2,
  minCompareableExplanations: 2,
  minSearchResults: 1,
  minSemanticMoments: 1,
};

/** Slightly relaxed minimums for non-homepage flagship seeds. */
export const FLAGSHIP_STANDARD_MINIMUMS: FlagshipTopicMinimums = {
  minIndexedVideos: 1,
  minUniqueCreators: 1,
  minCitationRichMoments: 1,
  minCompareableExplanations: 1,
  minSearchResults: 1,
  minSemanticMoments: 0,
};

export const FLAGSHIP_TOPICS: FlagshipTopicDefinition[] = [
  {
    id: "what-is-rag",
    label: "What is RAG?",
    primaryQuery: "what is rag",
    aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
    topicHubSlugs: ["transformers", "vector-database"],
    collectionSlugs: ["best-rag-explanations"],
    homepagePromoted: true,
    promotionSurfaces: ["homepage_example_search"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "ai-agents",
    label: "AI agents",
    primaryQuery: "ai agents",
    aliases: ["ai agent", "agentic ai", "autonomous agents"],
    topicHubSlugs: ["ai-agents", "artificial-intelligence"],
    collectionSlugs: ["anthropic-ai-safety"],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip", "trending_link"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "kubernetes-scheduling",
    label: "Kubernetes scheduling",
    primaryQuery: "kubernetes scheduling",
    aliases: ["kubernetes", "k8s scheduling", "pod scheduling"],
    topicHubSlugs: ["kubernetes-beginners", "docker-devops"],
    collectionSlugs: ["kubernetes-explained"],
    homepagePromoted: true,
    promotionSurfaces: ["homepage_example_topic"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "prompt-engineering",
    label: "Prompt engineering",
    primaryQuery: "prompt engineering",
    aliases: ["prompting", "llm prompts", "prompt design"],
    topicHubSlugs: ["large-language-models", "transformers"],
    collectionSlugs: [],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "react-hooks",
    label: "React hooks",
    primaryQuery: "react hooks",
    aliases: ["useState", "useEffect", "react hook"],
    topicHubSlugs: ["javascript", "typescript-course"],
    collectionSlugs: ["typescript-explanations"],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "startup-advice",
    label: "Startup advice",
    primaryQuery: "startup advice",
    aliases: ["startup", "founder advice", "product market fit"],
    topicHubSlugs: ["product-market-fit", "fundraising"],
    collectionSlugs: ["startup-advice"],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "system-design",
    label: "System design",
    primaryQuery: "system design",
    aliases: ["systems design", "architecture interview"],
    topicHubSlugs: ["system-design"],
    collectionSlugs: [],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "productivity",
    label: "Productivity",
    primaryQuery: "productivity",
    aliases: ["deep work", "focus", "time management"],
    topicHubSlugs: ["productivity", "focus"],
    collectionSlugs: [],
    homepagePromoted: true,
    promotionSurfaces: ["start_here_chip"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
  {
    id: "anthropic-ai-safety",
    label: "Anthropic · AI safety",
    primaryQuery: "anthropic ai safety",
    aliases: ["anthropic", "ai safety", "ai alignment"],
    topicHubSlugs: ["anthropic-ai-safety", "artificial-intelligence"],
    collectionSlugs: ["anthropic-ai-safety"],
    homepagePromoted: true,
    promotionSurfaces: ["homepage_example_collection"],
    minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
  },
];

/** Ensure start-here chips are represented (dedupe by query). */
function mergeStartHereChips(topics: FlagshipTopicDefinition[]): FlagshipTopicDefinition[] {
  const byQuery = new Map(topics.map((t) => [t.primaryQuery.toLowerCase(), t]));
  for (const chip of START_HERE_CHIPS) {
    const phrase = chip.href.split("/search/").pop()?.replace(/-/g, " ") ?? chip.label.toLowerCase();
    const key = phrase.toLowerCase();
    if (!byQuery.has(key)) {
      byQuery.set(key, {
        id: key.replace(/\s+/g, "-"),
        label: chip.label,
        primaryQuery: phrase,
        aliases: [],
        topicHubSlugs: [],
        collectionSlugs: [],
        homepagePromoted: true,
        promotionSurfaces: ["start_here_chip"],
        minimums: FLAGSHIP_HOMEPAGE_TRUST_MINIMUMS,
      });
    }
  }
  return [...byQuery.values()];
}

export function listFlagshipTopics(): FlagshipTopicDefinition[] {
  return mergeStartHereChips(FLAGSHIP_TOPICS);
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(q: string): string[] {
  return normalizeText(q)
    .split(" ")
    .filter((t) => t.length > 1);
}

/** Match public-moment rows to a flagship topic (corpus-side, not live search). */
export function matchMomentsToFlagship(
  def: FlagshipTopicDefinition,
  moments: PublicMomentRecord[]
): PublicMomentRecord[] {
  const queries = [def.primaryQuery, ...def.aliases].map(normalizeText);
  const hubSlugs = def.topicHubSlugs.map((s) => normalizeText(s.replace(/-/g, " ")));

  return moments.filter((m) => {
    const blob = normalizeText(
      [m.topic, m.phrase, m.snippet, m.videoTitle, m.channelName].filter(Boolean).join(" ")
    );
    if (hubSlugs.some((h) => blob.includes(h) || normalizeText(m.topic ?? "") === h.replace(/\s+/g, "-"))) {
      return true;
    }
    for (const q of queries) {
      if (!q) continue;
      if (blob.includes(q)) return true;
      const tokens = queryTokens(q);
      if (tokens.length >= 2 && tokens.every((t) => blob.includes(t))) return true;
    }
    return false;
  });
}

export type FlagshipTopicCorpusMetrics = {
  indexedVideos: number;
  uniqueCreators: number;
  citationRichMoments: number;
  semanticMoments: number;
  totalMatchedMoments: number;
  compareReadyExplanations: number;
  topicHubsAvailable: string[];
  collectionsAvailable: string[];
  searchResultCount: number;
  searchVideoCount: number;
};

export type FlagshipTopicCoverageRow = {
  id: string;
  label: string;
  primaryQuery: string;
  aliases: string[];
  homepagePromoted: boolean;
  promotionSurfaces: FlagshipPromotionSurface[];
  minimums: FlagshipTopicMinimums;
  metrics: FlagshipTopicCorpusMetrics;
  status: FlagshipCoverageStatus;
  homepageTrustSatisfied: boolean;
  homepageSafetyRisk: boolean;
  failedMinimums: string[];
  ingestionRecommendations: string[];
};

export type FlagshipTopicCoverageReport = {
  generatedAt: string;
  topics: FlagshipTopicCoverageRow[];
  homepageSafety: {
    promotedCount: number;
    brokenCount: number;
    weakCount: number;
    healthyCount: number;
    brokenTopics: string[];
    weakTopics: string[];
  };
  summary: {
    totalFlagshipTopics: number;
    healthy: number;
    weak: number;
    broken: number;
  };
};

function isSemanticMoment(m: PublicMomentRecord): boolean {
  return (m.semantic?.extractionKinds?.length ?? 0) > 0;
}

function evaluateMinimums(
  def: FlagshipTopicDefinition,
  metrics: FlagshipTopicCorpusMetrics
): { failed: string[]; homepageTrustSatisfied: boolean } {
  const m = def.minimums;
  const failed: string[] = [];
  if (metrics.indexedVideos < m.minIndexedVideos) {
    failed.push(`indexedVideos ${metrics.indexedVideos} < ${m.minIndexedVideos}`);
  }
  if (metrics.uniqueCreators < m.minUniqueCreators) {
    failed.push(`uniqueCreators ${metrics.uniqueCreators} < ${m.minUniqueCreators}`);
  }
  if (metrics.citationRichMoments < m.minCitationRichMoments) {
    failed.push(`citationRichMoments ${metrics.citationRichMoments} < ${m.minCitationRichMoments}`);
  }
  if (metrics.compareReadyExplanations < m.minCompareableExplanations) {
    failed.push(
      `compareReadyExplanations ${metrics.compareReadyExplanations} < ${m.minCompareableExplanations}`
    );
  }
  if (metrics.searchResultCount < m.minSearchResults) {
    failed.push(`searchResultCount ${metrics.searchResultCount} < ${m.minSearchResults}`);
  }
  if (metrics.semanticMoments < m.minSemanticMoments) {
    failed.push(`semanticMoments ${metrics.semanticMoments} < ${m.minSemanticMoments}`);
  }
  return { failed, homepageTrustSatisfied: failed.length === 0 };
}

export function classifyFlagshipCoverageStatus(
  def: FlagshipTopicDefinition,
  metrics: FlagshipTopicCorpusMetrics,
  failedMinimums: string[]
): FlagshipCoverageStatus {
  if (
    def.homepagePromoted &&
    (metrics.searchResultCount < def.minimums.minSearchResults || metrics.indexedVideos === 0)
  ) {
    return "broken";
  }
  if (failedMinimums.length === 0) return "healthy";
  if (
    metrics.searchResultCount === 0 ||
    metrics.indexedVideos === 0 ||
    (def.homepagePromoted && failedMinimums.length >= 3)
  ) {
    return "broken";
  }
  return "weak";
}

function loadWave1CandidatesSafe(): Wave1PlanCandidate[] {
  const path = join(process.cwd(), "data", "ingestion-wave-1-candidates.json");
  if (!existsSync(path)) return [];
  try {
    return loadWave1PlanFile(path).candidates ?? [];
  } catch {
    return [];
  }
}

function topicTokens(s: string): string[] {
  return normalizeText(s).split(" ").filter((t) => t.length > 2);
}

function wave1Recommendations(def: FlagshipTopicDefinition, candidates: Wave1PlanCandidate[]): string[] {
  const keys = new Set([
    ...topicTokens(def.primaryQuery),
    ...def.aliases.flatMap(topicTokens),
    ...def.topicHubSlugs.flatMap((s) => topicTokens(s.replace(/-/g, " "))),
  ]);
  const hits = candidates.filter((c) =>
    (c.targetTopics ?? []).some((t) => {
      const tt = topicTokens(t.replace(/-/g, " "));
      return tt.some((tok) => keys.has(tok));
    })
  );
  return hits
    .sort((a, b) => (b.sourceQuality?.score ?? 0) - (a.sourceQuality?.score ?? 0))
    .slice(0, 5)
    .map(
      (c) =>
        `Wave 1 candidate ${c.id} — ${c.channelName}: “${c.videoTitle.slice(0, 72)}…” (tier ${c.sourceQuality?.tier}, score ${c.sourceQuality?.score})`
    );
}

function allowlistRecommendations(def: FlagshipTopicDefinition): string[] {
  const allow = loadAllAllowlistEntries();
  const categoryHints: Record<string, string[]> = {
    "what-is-rag": ["ai_research", "education"],
    "ai-agents": ["ai_research"],
    "kubernetes-scheduling": ["devops", "education"],
    "prompt-engineering": ["ai_research", "education"],
    "react-hooks": ["education", "coding"],
    "startup-advice": ["business", "ai_research"],
  };
  const cats = categoryHints[def.id] ?? [];
  return allow
    .filter((a) => cats.includes(a.category) && a.ingestPriority >= 80)
    .slice(0, 3)
    .map((a) => `Allowlist priority — index channel “${a.channelName}” (${a.category}, priority ${a.ingestPriority})`);
}

function missingCorpusRecommendations(
  def: FlagshipTopicDefinition,
  coverageRows: TopicCoverageRow[]
): string[] {
  const keys = topicTokens(def.primaryQuery);
  const related = coverageRows.filter((r) => {
    const rt = topicTokens(r.topic);
    return keys.some((k) => rt.some((t) => t.includes(k) || k.includes(t)));
  });
  return related
    .filter((r) => r.weakComparisonDepth || r.numberOfMoments < 4)
    .slice(0, 2)
    .map(
      (r) =>
        `Topic coverage gap — corpus topic “${r.topic}” has ${r.numberOfMoments} moments / ${r.numberOfVideos} videos (weakDepth=${r.weakComparisonDepth})`
    );
}

export async function buildFlagshipTopicCorpusMetrics(
  def: FlagshipTopicDefinition,
  moments: PublicMomentRecord[],
  options?: { skipLiveSearch?: boolean }
): Promise<FlagshipTopicCorpusMetrics> {
  const matched = matchMomentsToFlagship(def, moments);
  const videoIds = new Set(matched.map((m) => m.videoId));
  const creators = new Set(matched.map((m) => m.channelName).filter(Boolean) as string[]);
  const citeRich = matched.filter(isPublicMomentCitationRich).length;
  const semantic = matched.filter(isSemanticMoment).length;
  const compareRows = comparePublicMomentsForTopic(matched, def.primaryQuery, 6);

  const topicHubsAvailable = def.topicHubSlugs.filter((slug) => {
    const hub = getTopicHubBySlug(slug);
    return hub != null && hub.moments.length >= 2;
  });

  const collectionsAvailable = def.collectionSlugs.filter((slug) => {
    const col = STATIC_PUBLIC_COLLECTIONS.find((c) => c.slug === slug);
    if (!col) return false;
    return col.momentIds.some((id) => moments.some((m) => m.id === id));
  });

  let searchResultCount = 0;
  let searchVideoCount = 0;
  if (!options?.skipLiveSearch) {
    try {
      const hybrid = await hybridSearchTranscripts(def.primaryQuery, 28, {
        enrichVideoCap: 8,
      });
      searchResultCount = hybrid.moments.length;
      searchVideoCount = new Set(hybrid.moments.map((m) => m.videoId)).size;
    } catch {
      searchResultCount = 0;
      searchVideoCount = 0;
    }
  }

  return {
    indexedVideos: videoIds.size,
    uniqueCreators: creators.size,
    citationRichMoments: citeRich,
    semanticMoments: semantic,
    totalMatchedMoments: matched.length,
    compareReadyExplanations: compareRows.length,
    topicHubsAvailable,
    collectionsAvailable,
    searchResultCount,
    searchVideoCount,
  };
}

export async function buildFlagshipTopicCoverageReport(
  moments: PublicMomentRecord[],
  options?: { skipLiveSearch?: boolean }
): Promise<FlagshipTopicCoverageReport> {
  const topics = listFlagshipTopics();
  const wave1 = loadWave1CandidatesSafe();
  const coverageRows = buildTopicCoverageReport(moments);
  const missingPath = join(process.cwd(), "data", "analytics", "source-index-requests.json");
  const samplePath = join(process.cwd(), "data", "analytics", "source-index-requests.sample.json");
  const requestsPath = existsSync(missingPath) ? missingPath : samplePath;
  buildMissingCorpusReport({ moments, coverage: coverageRows, requestsPath });

  const rows: FlagshipTopicCoverageRow[] = [];

  for (const def of topics) {
    const metrics = await buildFlagshipTopicCorpusMetrics(def, moments, options);
    const { failed, homepageTrustSatisfied } = evaluateMinimums(def, metrics);
    const status = classifyFlagshipCoverageStatus(def, metrics, failed);
    const homepageSafetyRisk = def.homepagePromoted && status === "broken";

    const ingestionRecommendations = [
      ...wave1Recommendations(def, wave1),
      ...allowlistRecommendations(def),
      ...missingCorpusRecommendations(def, coverageRows),
    ];
    if (status !== "healthy" && metrics.searchResultCount === 0) {
      ingestionRecommendations.unshift(
        `URGENT: production search returns 0 for “${def.primaryQuery}” — index transcript moments or relax query gates before promoting on homepage`
      );
    }
    const uniqueRecs = [...new Set(ingestionRecommendations)].slice(0, 8);

    rows.push({
      id: def.id,
      label: def.label,
      primaryQuery: def.primaryQuery,
      aliases: def.aliases,
      homepagePromoted: def.homepagePromoted,
      promotionSurfaces: def.promotionSurfaces,
      minimums: def.minimums,
      metrics,
      status,
      homepageTrustSatisfied,
      homepageSafetyRisk,
      failedMinimums: failed,
      ingestionRecommendations: uniqueRecs,
    });
  }

  const promoted = rows.filter((r) => r.homepagePromoted);
  const brokenTopics = promoted.filter((r) => r.status === "broken").map((r) => r.label);
  const weakTopics = promoted.filter((r) => r.status === "weak").map((r) => r.label);

  return {
    generatedAt: new Date().toISOString(),
    topics: rows,
    homepageSafety: {
      promotedCount: promoted.length,
      brokenCount: brokenTopics.length,
      weakCount: weakTopics.length,
      healthyCount: promoted.filter((r) => r.status === "healthy").length,
      brokenTopics,
      weakTopics,
    },
    summary: {
      totalFlagshipTopics: rows.length,
      healthy: rows.filter((r) => r.status === "healthy").length,
      weak: rows.filter((r) => r.status === "weak").length,
      broken: rows.filter((r) => r.status === "broken").length,
    },
  };
}

export function formatFlagshipTopicCoverageMarkdown(report: FlagshipTopicCoverageReport): string {
  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(0)}%` : "—");

  const homepageBlock =
    report.homepageSafety.brokenCount > 0
      ? `

> **HOMEPAGE SAFETY — ACTION REQUIRED:** ${report.homepageSafety.brokenCount} promoted topic(s) are **broken** and will show zero or untrustworthy search results: ${report.homepageSafety.brokenTopics.map((t) => `**${t}**`).join(", ")}.
`
      : report.homepageSafety.weakCount > 0
        ? `

> **HOMEPAGE SAFETY — WARNING:** ${report.homepageSafety.weakCount} promoted topic(s) are **weak**: ${report.homepageSafety.weakTopics.join(", ")}.
`
        : `

> **HOMEPAGE SAFETY:** All ${report.homepageSafety.promotedCount} homepage-promoted flagship topics meet trust minimums in this run.
`;

  const table = `| Topic | Status | Search hits | Videos | Creators | Cite-rich | Compare | Hubs | Collections | Homepage OK |
|-------|--------|------------:|-------:|---------:|----------:|--------:|------|-------------|:-------------:|
${report.topics
  .map((r) => {
    const m = r.metrics;
    return `| ${r.label} | **${r.status}** | ${m.searchResultCount} | ${m.indexedVideos} | ${m.uniqueCreators} | ${m.citationRichMoments} | ${m.compareReadyExplanations} | ${m.topicHubsAvailable.length} | ${m.collectionsAvailable.length} | ${r.homepageTrustSatisfied ? "yes" : "no"} |`;
  })
  .join("\n")}`;

  const details = report.topics
    .map((r) => {
      const m = r.metrics;
      return `### ${r.label} (\`${r.id}\`)

- **Primary query:** \`${r.primaryQuery}\`
- **Status:** \`${r.status}\` — homepage promoted: ${r.homepagePromoted} (${r.promotionSurfaces.join(", ") || "—"})
- **Production search:** ${m.searchResultCount} moments across ${m.searchVideoCount} videos
- **Corpus match:** ${m.totalMatchedMoments} moments, ${m.indexedVideos} videos, ${m.uniqueCreators} creators
- **Citation-rich / semantic:** ${m.citationRichMoments} / ${m.semanticMoments}
- **Compare-ready rows:** ${m.compareReadyExplanations}
- **Topic hubs:** ${m.topicHubsAvailable.length ? m.topicHubsAvailable.map((s) => `\`${s}\``).join(", ") : "—"}
- **Collections:** ${m.collectionsAvailable.length ? m.collectionsAvailable.map((s) => `\`${s}\``).join(", ") : "—"}
- **Homepage trust satisfied:** ${r.homepageTrustSatisfied}
${r.failedMinimums.length ? `- **Failed minimums:** ${r.failedMinimums.join("; ")}` : ""}
${r.ingestionRecommendations.length ? `- **Ingestion recommendations:**\n${r.ingestionRecommendations.map((x) => `  - ${x}`).join("\n")}` : ""}
`;
    })
    .join("\n");

  return `# Flagship topic coverage report

Generated: ${report.generatedAt}

## Summary

| Metric | Value |
|--------|------:|
| Flagship topics tracked | ${report.summary.totalFlagshipTopics} |
| Healthy | ${report.summary.healthy} (${pct(report.summary.healthy, report.summary.totalFlagshipTopics)}) |
| Weak | ${report.summary.weak} |
| Broken | ${report.summary.broken} |
| Homepage promoted | ${report.homepageSafety.promotedCount} |
| Homepage healthy | ${report.homepageSafety.healthyCount} |

${homepageBlock}

## Coverage table

${table}

## Per-topic detail

${details}

## Regenerate

\`\`\`bash
npm run report:flagship-topics
\`\`\`

See \`lib/corpus/flagship-topics.ts\` for curated topics and trust minimums.
`;
}
