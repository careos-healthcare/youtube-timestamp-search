/**
 * Graph-backed topic deepening planner — deepen elite topics, do not broaden globally.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { FlagshipCoverageStatus } from "@/lib/corpus/flagship-topics";
import {
  listHighSignalTopics,
  matchMomentsToHighSignalTopic,
  type HighSignalTopicDefinition,
} from "@/lib/corpus/high-signal-topics";
import { loadAllAllowlistEntries } from "@/lib/corpus/source-allowlists";
import type { TopicCoverageRow } from "@/lib/corpus/topic-coverage";
import type {
  ResearchGradeTopicReport,
  TopicResearchGradeRow,
} from "@/lib/corpus/topic-research-grade";
import { loadWave1PlanFile, type Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

import type { ResearchGraphEdgeKind } from "./research-graph-types";
import type { ResearchGraphEdge, ResearchGraphNode, ResearchGraphSnapshot } from "./research-graph-types";
import type { TopicClusterMetric } from "./research-graph-metrics";

export type TopicDeepeningStatus =
  | "ready_to_showcase"
  | "deepen_next"
  | "needs_source_diversity"
  | "needs_citations"
  | "needs_beginner_explanations"
  | "needs_technical_explanations"
  | "needs_primary_sources"
  | "broken_do_not_promote";

export type TopicDeepeningRiskLevel = "low" | "medium" | "high";

export type ExplanationRoleCoverage = {
  hasBeginner: boolean;
  hasTechnical: boolean;
  hasCounterpoint: boolean;
  hasPrimarySourceMoment: boolean;
  beginnerShare: number;
  technicalShare: number;
  counterpointShare: number;
};

export type TopicDeepeningMetrics = {
  graphDepth: number;
  graphMomentCount: number;
  graphVideoCount: number;
  graphCreatorCount: number;
  graphEdgeCount: number;
  citationDensity: number;
  creatorDiversity: number;
  explanationRoleCoverage: ExplanationRoleCoverage;
  compareReadiness: number;
  primarySourceCoverage: number;
  orphanMomentCount: number;
  weakContextShare: number;
  missingEdgeTypes: ResearchGraphEdgeKind[];
  missingSourceTypes: string[];
  researchGradeTier: string;
  distanceToElite: number;
  topicTrustScore: number;
};

export type IngestionCandidateRecommendation = {
  id: string;
  kind: "wave1_video" | "allowlist_channel";
  videoId?: string;
  channelName?: string;
  label: string;
  riskLevel: TopicDeepeningRiskLevel;
  expectedGraphGain: string;
  score: number;
};

export type TopicDeepeningAnalysis = {
  topicSlug: string;
  label: string;
  vertical: string;
  status: TopicDeepeningStatus;
  priority: number;
  reason: string;
  metrics: TopicDeepeningMetrics;
  targetMissingCapabilities: string[];
  ingestionCandidates: IngestionCandidateRecommendation[];
  expectedGraphGain: string;
  maxRecommendedIngestCount: number;
  riskLevel: TopicDeepeningRiskLevel;
};

export type TopicDeepeningQueueRow = {
  topicSlug: string;
  currentStatus: TopicDeepeningStatus;
  priority: number;
  reason: string;
  targetMissingCapabilities: string[];
  candidateVideoIds: string[];
  candidateSourceIds: string[];
  maxRecommendedIngestCount: number;
  riskLevel: TopicDeepeningRiskLevel;
};

export type TopicDeepeningReport = {
  generatedAt: string;
  graphGeneratedAt: string | null;
  topicCount: number;
  summary: {
    readyToShowcase: number;
    deepenNext: number;
    brokenDoNotPromote: number;
    queuedForIngest: number;
  };
  analyses: TopicDeepeningAnalysis[];
  queue: TopicDeepeningQueueRow[];
  topDeepenNow: TopicDeepeningAnalysis[];
  unsafeToPromote: TopicDeepeningAnalysis[];
  closestToShowcase: TopicDeepeningAnalysis[];
  recommendedIngestBatch: TopicDeepeningQueueRow[];
};

const TOPIC_EDGE_TYPES: ResearchGraphEdgeKind[] = [
  "compared_with",
  "cites",
  "supports",
  "contradicts_or_caveats",
  "saved_in",
  "same_topic_as",
];

const WEAK_AUTHORITY = new Set([
  "opinion_heavy",
  "entertainment_commentary",
  "unknown_weak_context",
]);

const PRIMARY_LABELS = new Set(["primary_source", "academic_technical", "practitioner"]);

type FlagshipTopicRow = {
  id: string;
  label: string;
  primaryQuery?: string;
  status: FlagshipCoverageStatus;
  homepagePromoted?: boolean;
  homepageSafetyRisk?: boolean;
  failedMinimums?: string[];
};

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function loadResearchGraphSnapshot(root = process.cwd()): ResearchGraphSnapshot | null {
  return loadJson<ResearchGraphSnapshot>(join(root, "data", "research-graph.json"));
}

export function loadResearchGradeReportFromDisk(root = process.cwd()): ResearchGradeTopicReport | null {
  return loadJson<ResearchGradeTopicReport>(join(root, "data", "research-grade-topic-report.json"));
}

function loadFlagshipById(root: string): Map<string, FlagshipTopicRow> {
  const raw = loadJson<{ topics?: FlagshipTopicRow[] }>(
    join(root, "data", "flagship-topic-coverage.json")
  );
  const map = new Map<string, FlagshipTopicRow>();
  for (const t of raw?.topics ?? []) {
    map.set(t.id, t);
  }
  return map;
}

function resolveFlagshipRow(
  def: HighSignalTopicDefinition,
  flagshipById: Map<string, FlagshipTopicRow>
): FlagshipTopicRow | undefined {
  if (flagshipById.has(def.canonicalSlug)) return flagshipById.get(def.canonicalSlug);
  for (const hub of def.topicHubSlugs) {
    if (flagshipById.has(hub)) return flagshipById.get(hub);
  }
  const query = def.primaryQuery.toLowerCase();
  for (const row of flagshipById.values()) {
    const idNorm = row.id.replace(/^what-is-/, "");
    if (idNorm === def.canonicalSlug) return row;
    if (row.primaryQuery?.toLowerCase() === query) return row;
  }
  return undefined;
}

function loadTopicCoverageByTopic(root: string): Map<string, TopicCoverageRow> {
  const raw = loadJson<{ rows?: TopicCoverageRow[] }>(join(root, "data", "topic-coverage.json"));
  const map = new Map<string, TopicCoverageRow>();
  for (const r of raw?.rows ?? []) {
    map.set(r.topic, r);
  }
  return map;
}

function loadWave1CandidatesSafe(root: string): Wave1PlanCandidate[] {
  const path = join(root, "data", "ingestion-wave-1-candidates.json");
  if (!existsSync(path)) return [];
  try {
    return loadWave1PlanFile(path).candidates ?? [];
  } catch {
    return [];
  }
}

function clustersFromGraph(graph: ResearchGraphSnapshot): Map<string, TopicClusterMetric> {
  const metrics = graph.metrics as { strongestTopicClusters?: TopicClusterMetric[] };
  const map = new Map<string, TopicClusterMetric>();
  for (const c of metrics.strongestTopicClusters ?? []) {
    map.set(c.topicSlug, c);
  }
  return map;
}

function explanationCoverageFromMoments(matched: PublicMomentRecord[]): ExplanationRoleCoverage {
  let beginner = 0;
  let technical = 0;
  let counter = 0;
  let primary = 0;
  const n = matched.length || 1;

  for (const m of matched) {
    const cls = classifyExplanationFromText({
      phrase: m.phrase,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    });
    if (cls.beginnerLikelihood >= 1 || cls.tutorialLikelihood >= 0.5) beginner += 1;
    if (cls.technicalLikelihood >= 1) technical += 1;
    if (cls.counterLikelihood >= 1) counter += 1;
    if (cls.primarySourceLikelihood >= 1) primary += 1;
  }

  return {
    hasBeginner: beginner > 0,
    hasTechnical: technical > 0,
    hasCounterpoint: counter > 0,
    hasPrimarySourceMoment: primary > 0,
    beginnerShare: beginner / n,
    technicalShare: technical / n,
    counterpointShare: counter / n,
  };
}

function aggregateTopicCoverage(
  def: HighSignalTopicDefinition,
  byTopic: Map<string, TopicCoverageRow>
): TopicCoverageRow | null {
  const slugs = [def.canonicalSlug, ...def.topicHubSlugs];
  let best: TopicCoverageRow | null = null;
  for (const slug of slugs) {
    const row = byTopic.get(slug);
    if (!row) continue;
    if (!best || row.numberOfMoments > best.numberOfMoments) best = row;
  }
  return best;
}

function momentNodeIdsForTopic(
  def: HighSignalTopicDefinition,
  matched: PublicMomentRecord[],
  nodes: ResearchGraphNode[]
): Set<string> {
  const ids = new Set(matched.map((m) => m.id));
  const out = new Set<string>();
  for (const n of nodes) {
    if (n.kind !== "PublicMoment") continue;
    const mid = String(n.properties.momentId ?? "");
    if (ids.has(mid)) out.add(n.id);
  }
  return out;
}

function analyzeGraphSlice(
  momentNodeIds: Set<string>,
  nodes: ResearchGraphNode[],
  edges: ResearchGraphEdge[],
  matched: PublicMomentRecord[],
  cluster: TopicClusterMetric | undefined
): Pick<
  TopicDeepeningMetrics,
  | "graphDepth"
  | "graphMomentCount"
  | "graphVideoCount"
  | "graphCreatorCount"
  | "graphEdgeCount"
  | "compareReadiness"
  | "orphanMomentCount"
  | "weakContextShare"
  | "missingEdgeTypes"
  | "missingSourceTypes"
> {
  const momentNodes = nodes.filter((n) => momentNodeIds.has(n.id));
  const momentCount = momentNodes.length;
  const videoIds = new Set(momentNodes.map((n) => String(n.properties.videoId)));
  const creators = new Set<string>();

  for (const vid of videoIds) {
    const video = nodes.find((n) => n.kind === "Video" && n.properties.videoId === vid);
    if (video) creators.add(String(video.properties.channelName));
  }

  const touch = new Set<string>();
  for (const e of edges) {
    if (momentNodeIds.has(e.sourceId) || momentNodeIds.has(e.targetId)) {
      touch.add(e.id);
    }
  }

  const edgeKindsPresent = new Set<ResearchGraphEdgeKind>();
  for (const e of edges) {
    if (!momentNodeIds.has(e.sourceId) && !momentNodeIds.has(e.targetId)) continue;
    edgeKindsPresent.add(e.kind);
  }

  const missingEdgeTypes = TOPIC_EDGE_TYPES.filter((k) => !edgeKindsPresent.has(k));

  let compareEdges = 0;
  for (const e of edges) {
    if (e.kind !== "compared_with") continue;
    if (momentNodeIds.has(e.sourceId) || momentNodeIds.has(e.targetId)) compareEdges += 1;
  }

  const compareReadiness =
    cluster?.compareReadiness ??
    Math.min(1, compareEdges / Math.max(1, momentCount * 0.5));

  let orphanMomentCount = 0;
  let weak = 0;
  for (const n of momentNodes) {
    const mid = n.id;
    const hasCompare = edges.some(
      (e) => e.kind === "compared_with" && (e.sourceId === mid || e.targetId === mid)
    );
    const hasCite = edges.some(
      (e) => e.kind === "cites" && (e.sourceId === mid || e.targetId === mid)
    );
    const hasSupport = edges.some(
      (e) =>
        (e.kind === "supports" || e.kind === "contradicts_or_caveats") &&
        (e.sourceId === mid || e.targetId === mid)
    );
    if (!hasCompare && !hasCite && !hasSupport) orphanMomentCount += 1;
    if (WEAK_AUTHORITY.has(String(n.properties.sourceAuthorityLabel))) weak += 1;
  }

  const sourceTypesPresent = new Set<string>();
  for (const e of edges) {
    if (!momentNodeIds.has(e.sourceId)) continue;
    if (e.kind === "source_context") {
      const target = nodes.find((n) => n.id === e.targetId);
      if (target?.kind === "Source") {
        sourceTypesPresent.add(String(target.properties.sourceType));
      }
    }
  }
  const missingSourceTypes: string[] = [];
  for (const future of ["podcast_rss", "webinar", "internal_upload"] as const) {
    if (!sourceTypesPresent.has(future)) missingSourceTypes.push(future);
  }
  const primaryMoments = momentNodes.filter((n) =>
    PRIMARY_LABELS.has(String(n.properties.sourceAuthorityLabel))
  ).length;
  if (momentCount > 0 && primaryMoments / momentCount < 0.15) {
    missingSourceTypes.push("primary_source_voice");
  }

  const graphDepth = Math.round(
    Math.min(
      100,
      Math.min(videoIds.size, 6) * 12 +
        Math.min(creators.size, 6) * 10 +
        Math.min(touch.size / Math.max(momentCount, 1), 8) * 8 +
        compareReadiness * 25
    )
  );

  return {
    graphDepth,
    graphMomentCount: momentCount,
    graphVideoCount: videoIds.size,
    graphCreatorCount: creators.size,
    graphEdgeCount: touch.size,
    compareReadiness,
    orphanMomentCount,
    weakContextShare: momentCount ? weak / momentCount : 0,
    missingEdgeTypes,
    missingSourceTypes,
  };
}

function topicMatchesWaveCandidate(def: HighSignalTopicDefinition, c: Wave1PlanCandidate): boolean {
  const topicTargets = new Set([def.canonicalSlug, ...def.topicHubSlugs]);
  for (const t of c.targetTopics ?? []) {
    if (topicTargets.has(t)) return true;
  }
  const blob = `${def.primaryQuery} ${def.aliases.join(" ")} ${def.label}`.toLowerCase();
  for (const t of c.targetTopics ?? []) {
    const phrase = t.replace(/-/g, " ");
    if (phrase.length >= 6 && blob.includes(phrase)) return true;
  }
  const keys = def.primaryQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 4);
  if (keys.length >= 2) {
    const title = c.videoTitle.toLowerCase();
    if (keys.every((k) => title.includes(k))) return true;
  }
  return false;
}

function allowlistMatchesVertical(
  def: HighSignalTopicDefinition,
  category: string
): boolean {
  const map: Record<string, string[]> = {
    ai_ml: ["ai_research", "ml_engineering"],
    devops: ["backend_devops", "programming_tutorials"],
    frontend: ["programming_tutorials"],
    startups: ["startup_founder"],
    safety_eval: ["ai_research", "university_lectures"],
    education: ["university_lectures", "programming_tutorials", "conference_talks"],
  };
  return (map[def.vertical] ?? []).includes(category);
}

function rankIngestionCandidates(
  def: HighSignalTopicDefinition,
  row: TopicResearchGradeRow,
  wave1: Wave1PlanCandidate[],
  indexedVideoIds: Set<string>,
  status: TopicDeepeningStatus
): IngestionCandidateRecommendation[] {
  const out: IngestionCandidateRecommendation[] = [];

  for (const c of wave1) {
    if (!topicMatchesWaveCandidate(def, c)) continue;
    if (indexedVideoIds.has(c.videoId)) continue;
    const tier = c.sourceQuality?.tier ?? "C";
    const score = (c.sourceQuality?.score ?? 50) + (tier === "A" ? 20 : tier === "B" ? 8 : 0);
    out.push({
      id: c.id,
      kind: "wave1_video",
      videoId: c.videoId,
      channelName: c.channelName,
      label: `${c.id} — ${c.channelName}: ${c.videoTitle.slice(0, 72)}…`,
      riskLevel: (c.riskLevel as TopicDeepeningRiskLevel) ?? "medium",
      expectedGraphGain:
        c.expectedTopicCoverageGain ??
        `Adds video depth for ${def.canonicalSlug}; improves graph edges (${status}).`,
      score,
    });
  }

  const allow = loadAllAllowlistEntries()
    .filter((a) => a.ingestPriority >= 85 && allowlistMatchesVertical(def, a.category))
    .slice(0, 2);
  for (const a of allow) {
    out.push({
      id: `allowlist:${a.channelId ?? a.channelName}`,
      kind: "allowlist_channel",
      channelName: a.channelName,
      label: `Allowlist — ${a.channelName} (${a.category}, priority ${a.ingestPriority})`,
      riskLevel: "low",
      expectedGraphGain: `Channel prior for ${def.vertical}; use for ${row.failedRequirements[0] ?? "diversity"} gaps.`,
      score: a.ingestPriority,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

function classifyStatus(input: {
  row: TopicResearchGradeRow;
  metrics: TopicDeepeningMetrics;
  explanation: ExplanationRoleCoverage;
  flagship: FlagshipTopicRow | undefined;
  coverage: TopicCoverageRow | null;
}): TopicDeepeningStatus {
  const { row, metrics, explanation, flagship, coverage } = input;
  const m = row.metrics;
  const req = row.requirements;

  if (row.tier === "broken" && m.momentCount === 0) return "broken_do_not_promote";
  if (row.tier === "broken" && row.failedRequirements.length >= 4) return "broken_do_not_promote";
  if (flagship?.homepageSafetyRisk) return "broken_do_not_promote";
  if (flagship?.homepagePromoted && flagship.status === "broken") return "broken_do_not_promote";

  const showcaseReady =
    (row.tier === "strong" || row.tier === "elite") &&
    row.failedRequirements.length === 0 &&
    metrics.graphDepth >= 55 &&
    metrics.compareReadiness >= 0.35 &&
    metrics.weakContextShare < 0.25 &&
    metrics.orphanMomentCount <= Math.max(1, Math.floor(metrics.graphMomentCount * 0.35));

  if (showcaseReady) return "ready_to_showcase";

  if (m.primarySourceRatio < req.minPrimarySourceCoverage) return "needs_primary_sources";
  if (m.citationDensity < req.minCitationDensity) return "needs_citations";
  if (m.uniqueCreators < req.minUniqueCreators || m.sourceDiversity < req.minSourceDiversity) {
    return "needs_source_diversity";
  }
  if (!explanation.hasBeginner || coverage?.missingBeginner) return "needs_beginner_explanations";
  if (!explanation.hasTechnical || (coverage && coverage.technicalCoverage < 0.15)) {
    return "needs_technical_explanations";
  }

  if (row.tier === "broken") return "broken_do_not_promote";

  if (row.distanceToElite < 0.35 || row.tier === "strong") return "deepen_next";

  return "deepen_next";
}

function statusReason(status: TopicDeepeningStatus, row: TopicResearchGradeRow): string {
  const m = row.metrics;
  switch (status) {
    case "ready_to_showcase":
      return `Research-grade ${row.tier} with graph depth ${m.momentCount} moments across ${m.indexedVideos} videos; trust ${m.topicTrustScore}.`;
    case "deepen_next":
      return `Within ${(row.distanceToElite * 100).toFixed(0)}% of elite bar — deepen graph before broad promotion.`;
    case "needs_source_diversity":
      return `Only ${m.uniqueCreators} creators / ${m.sourceDiversity} authority labels — need contrasting voices.`;
    case "needs_citations":
      return `Citation density ${(m.citationDensity * 100).toFixed(0)}% below ${(row.requirements.minCitationDensity * 100).toFixed(0)}% bar.`;
    case "needs_beginner_explanations":
      return "Graph lacks beginner/tutorial explanation roles for compare onboarding.";
    case "needs_technical_explanations":
      return "Graph lacks technical depth moments for practitioner compare paths.";
    case "needs_primary_sources":
      return `Primary-source share ${(m.primarySourceRatio * 100).toFixed(0)}% below governance minimum.`;
    case "broken_do_not_promote":
      return `Broken tier (${row.failedRequirements.slice(0, 3).join("; ")}) — do not promote or ingest blindly.`;
    default:
      return row.notes[0] ?? "Topic deepening review required.";
  }
}

function targetCapabilities(
  status: TopicDeepeningStatus,
  metrics: TopicDeepeningMetrics,
  row: TopicResearchGradeRow
): string[] {
  const caps: string[] = [];
  if (status === "needs_citations") caps.push("citation-rich moments", "cites edges");
  if (status === "needs_source_diversity") caps.push("second creator", "contrasting authority");
  if (status === "needs_beginner_explanations") caps.push("beginner_explanation role");
  if (status === "needs_technical_explanations") caps.push("technical_explanation role");
  if (status === "needs_primary_sources") caps.push("primary_source_moment", "academic_technical voice");
  if (status === "deepen_next") caps.push("compare_with edges", "supports/contradicts edges");
  for (const e of metrics.missingEdgeTypes) {
    caps.push(`${e} edges`);
  }
  for (const s of metrics.missingSourceTypes) {
    caps.push(s);
  }
  for (const f of row.failedRequirements.slice(0, 4)) {
    caps.push(`close gap: ${f}`);
  }
  return [...new Set(caps)].slice(0, 8);
}

function deepeningPriority(status: TopicDeepeningStatus, row: TopicResearchGradeRow): number {
  if (status === "broken_do_not_promote") return 0;
  if (status === "ready_to_showcase") return 15;
  const baseByStatus: Partial<Record<TopicDeepeningStatus, number>> = {
    deepen_next: 95,
    needs_citations: 88,
    needs_source_diversity: 85,
    needs_primary_sources: 82,
    needs_beginner_explanations: 75,
    needs_technical_explanations: 72,
  };
  const base = baseByStatus[status] ?? 60;
  const tierBoostByTier: Record<string, number> = { strong: 25, weak: 15, elite: 10, broken: 0 };
  const tierBoost = tierBoostByTier[row.tier] ?? 0;
  const proximity = Math.round((1 - Math.min(row.distanceToElite, 1)) * 20);
  const moat = row.metrics.researchGradeScore >= 50 ? 10 : 0;
  return Math.round(base + tierBoost + proximity + moat);
}

function maxIngestCount(status: TopicDeepeningStatus, row: TopicResearchGradeRow): number {
  if (status === "ready_to_showcase") return 0;
  if (status === "broken_do_not_promote") return row.metrics.momentCount > 0 ? 1 : 2;
  if (status === "deepen_next") return 2;
  return 3;
}

function aggregateRisk(candidates: IngestionCandidateRecommendation[], weakShare: number): TopicDeepeningRiskLevel {
  if (candidates.some((c) => c.riskLevel === "high")) return "high";
  if (weakShare > 0.4 || candidates.some((c) => c.riskLevel === "medium")) return "medium";
  return "low";
}

function summarizeExpectedGain(candidates: IngestionCandidateRecommendation[]): string {
  if (!candidates.length) return "No wave-1 candidates matched; allowlist channel indexing only.";
  const top = candidates.slice(0, 2).map((c) => c.expectedGraphGain.slice(0, 120));
  return top.join(" | ");
}

export type BuildTopicDeepeningInput = {
  moments: PublicMomentRecord[];
  graph: ResearchGraphSnapshot;
  researchGrade: ResearchGradeTopicReport;
  rootDir?: string;
};

export function buildTopicDeepeningReport(input: BuildTopicDeepeningInput): TopicDeepeningReport {
  const root = input.rootDir ?? process.cwd();
  const { graph, researchGrade, moments } = input;
  const gradeBySlug = new Map(researchGrade.topics.map((t) => [t.canonicalSlug, t]));
  const flagshipById = loadFlagshipById(root);
  const topicCoverageByTopic = loadTopicCoverageByTopic(root);
  const wave1 = loadWave1CandidatesSafe(root);
  const indexedVideoIds = new Set(
    graph.nodes
      .filter((n) => n.kind === "Video")
      .map((n) => String(n.properties.videoId))
  );
  const clustersBySlug = clustersFromGraph(graph);

  const analyses: TopicDeepeningAnalysis[] = [];

  for (const def of listHighSignalTopics()) {
    const row = gradeBySlug.get(def.canonicalSlug);
    if (!row) continue;

    const matched = matchMomentsToHighSignalTopic(def, moments);
    const momentNodeIds = momentNodeIdsForTopic(def, matched, graph.nodes);
    const cluster =
      clustersBySlug.get(def.canonicalSlug) ??
      def.topicHubSlugs.map((s) => clustersBySlug.get(s)).find(Boolean);

    const graphSlice = analyzeGraphSlice(momentNodeIds, graph.nodes, graph.edges, matched, cluster);
    const explanation = explanationCoverageFromMoments(matched);
    const coverage = aggregateTopicCoverage(def, topicCoverageByTopic);

    const metrics: TopicDeepeningMetrics = {
      ...graphSlice,
      citationDensity: row.metrics.citationDensity,
      creatorDiversity: row.metrics.uniqueCreators,
      explanationRoleCoverage: explanation,
      primarySourceCoverage: row.metrics.primarySourceRatio,
      researchGradeTier: row.tier,
      distanceToElite: row.distanceToElite,
      topicTrustScore: row.metrics.topicTrustScore,
    };

    const status = classifyStatus({
      row,
      metrics,
      explanation,
      flagship: resolveFlagshipRow(def, flagshipById),
      coverage,
    });

    const ingestionCandidates = rankIngestionCandidates(
      def,
      row,
      wave1,
      indexedVideoIds,
      status
    );

    const priority = deepeningPriority(status, row);

    analyses.push({
      topicSlug: def.canonicalSlug,
      label: def.label,
      vertical: def.vertical,
      status,
      priority,
      reason: statusReason(status, row),
      metrics,
      targetMissingCapabilities: targetCapabilities(status, metrics, row),
      ingestionCandidates,
      expectedGraphGain: summarizeExpectedGain(ingestionCandidates),
      maxRecommendedIngestCount: maxIngestCount(status, row),
      riskLevel: aggregateRisk(ingestionCandidates, metrics.weakContextShare),
    });
  }

  analyses.sort((a, b) => b.priority - a.priority);

  const queue: TopicDeepeningQueueRow[] = analyses
    .filter((a) => a.priority > 0 && a.status !== "ready_to_showcase")
    .slice(0, 25)
    .map((a) => ({
      topicSlug: a.topicSlug,
      currentStatus: a.status,
      priority: a.priority,
      reason: a.reason,
      targetMissingCapabilities: a.targetMissingCapabilities,
      candidateVideoIds: a.ingestionCandidates
        .filter((c) => c.videoId)
        .map((c) => c.videoId as string)
        .slice(0, a.maxRecommendedIngestCount),
      candidateSourceIds: a.ingestionCandidates.map((c) => c.id).slice(0, a.maxRecommendedIngestCount + 2),
      maxRecommendedIngestCount: a.maxRecommendedIngestCount,
      riskLevel: a.riskLevel,
    }));

  const topDeepenNow = analyses
    .filter((a) => a.status === "deepen_next" || a.status.startsWith("needs_"))
    .filter((a) => a.metrics.graphMomentCount > 0)
    .slice(0, 12);

  const unsafeToPromote = analyses.filter((a) => a.status === "broken_do_not_promote").slice(0, 15);

  const closestToShowcase = analyses
    .filter((a) => a.status !== "broken_do_not_promote" && a.status !== "ready_to_showcase")
    .sort((a, b) => a.metrics.distanceToElite - b.metrics.distanceToElite)
    .slice(0, 12);

  const recommendedIngestBatch = queue
    .filter((q) => q.candidateVideoIds.length > 0)
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    graphGeneratedAt: graph.generatedAt ?? null,
    topicCount: analyses.length,
    summary: {
      readyToShowcase: analyses.filter((a) => a.status === "ready_to_showcase").length,
      deepenNext: analyses.filter((a) => a.status === "deepen_next").length,
      brokenDoNotPromote: analyses.filter((a) => a.status === "broken_do_not_promote").length,
      queuedForIngest: queue.length,
    },
    analyses,
    queue,
    topDeepenNow,
    unsafeToPromote,
    closestToShowcase,
    recommendedIngestBatch,
  };
}

export function buildTopicDeepeningFromDisk(
  moments: PublicMomentRecord[],
  root = process.cwd()
): TopicDeepeningReport {
  const graph = loadResearchGraphSnapshot(root);
  const researchGrade = loadResearchGradeReportFromDisk(root);
  if (!graph) throw new Error("Missing data/research-graph.json — run npm run report:research-graph");
  if (!researchGrade) {
    throw new Error(
      "Missing data/research-grade-topic-report.json — run npm run report:research-grade-topics"
    );
  }
  return buildTopicDeepeningReport({ moments, graph, researchGrade, rootDir: root });
}

export function formatTopicDeepeningMarkdown(report: TopicDeepeningReport): string {
  const lines: string[] = [
    "# Topic Deepening Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Research graph snapshot: ${report.graphGeneratedAt ?? "unknown"}`,
    "",
    "## Summary",
    "",
    `- Topics analyzed: **${report.topicCount}**`,
    `- Ready to showcase: **${report.summary.readyToShowcase}**`,
    `- Deepen next: **${report.summary.deepenNext}**`,
    `- Broken / do not promote: **${report.summary.brokenDoNotPromote}**`,
    `- Queued for topic-deepening ingest: **${report.summary.queuedForIngest}**`,
    "",
    "> Next ingestion must be **topic-deepening driven**, not a global best queue. Target ~10 elite research topics.",
    "",
    "## Top topics to deepen now",
    "",
  ];

  if (!report.topDeepenNow.length) {
    lines.push("_No topics with corpus moments qualified for deepen-next._", "");
  } else {
    for (const a of report.topDeepenNow) {
      lines.push(
        `### ${a.label} (\`${a.topicSlug}\`)`,
        "",
        `- Status: **${a.status}** | Priority: **${a.priority}** | Risk: **${a.riskLevel}**`,
        `- Graph depth: **${a.metrics.graphDepth}** | Moments: **${a.metrics.graphMomentCount}** | Compare readiness: **${(a.metrics.compareReadiness * 100).toFixed(0)}%**`,
        `- Citation density: **${(a.metrics.citationDensity * 100).toFixed(0)}%** | Creators: **${a.metrics.creatorDiversity}** | Orphans: **${a.metrics.orphanMomentCount}**`,
        `- Reason: ${a.reason}`,
        `- Missing: ${a.targetMissingCapabilities.join(", ") || "—"}`,
        `- Expected gain: ${a.expectedGraphGain}`,
        ""
      );
      if (a.ingestionCandidates.length) {
        lines.push("**Candidates:**");
        for (const c of a.ingestionCandidates.slice(0, 4)) {
          lines.push(`- ${c.label} (${c.riskLevel} risk)`);
        }
        lines.push("");
      }
    }
  }

  lines.push("## Topics not safe to promote", "");
  if (!report.unsafeToPromote.length) {
    lines.push("_None flagged._", "");
  } else {
    for (const a of report.unsafeToPromote.slice(0, 12)) {
      lines.push(`- **${a.label}** (\`${a.topicSlug}\`) — ${a.reason}`);
    }
    lines.push("");
  }

  lines.push("## Closest to showcase-ready", "");
  for (const a of report.closestToShowcase.slice(0, 10)) {
    lines.push(
      `- **${a.label}** (\`${a.topicSlug}\`) — ${a.status}, elite distance ${a.metrics.distanceToElite.toFixed(2)}, trust ${a.metrics.topicTrustScore}`
    );
  }
  lines.push("");

  lines.push("## Recommended next ingest batch (topic-deepening)", "");
  lines.push("");
  lines.push("| Topic | Status | Priority | Max ingest | Video IDs |");
  lines.push("| --- | --- | ---: | ---: | --- |");
  for (const q of report.recommendedIngestBatch) {
    lines.push(
      `| ${q.topicSlug} | ${q.currentStatus} | ${q.priority} | ${q.maxRecommendedIngestCount} | ${q.candidateVideoIds.join(", ") || "—"} |`
    );
  }
  lines.push("");

  lines.push("## Risk notes", "");
  const highRisk = report.analyses.filter((a) => a.riskLevel === "high").slice(0, 8);
  if (!highRisk.length) {
    lines.push("- No high-risk deepening rows in current queue.", "");
  } else {
    for (const a of highRisk) {
      lines.push(`- **${a.topicSlug}**: ${a.reason}`);
    }
    lines.push("");
  }

  lines.push("## Graph deltas expected", "");
  for (const q of report.recommendedIngestBatch.slice(0, 8)) {
    const a = report.analyses.find((x) => x.topicSlug === q.topicSlug);
    lines.push(`- **${q.topicSlug}**: ${a?.expectedGraphGain ?? "—"}`);
  }
  lines.push("");

  lines.push("## Full queue", "");
  lines.push("");
  lines.push("| Slug | Status | Priority | Risk | Targets |");
  lines.push("| --- | --- | ---: | --- | --- |");
  for (const q of report.queue) {
    lines.push(
      `| ${q.topicSlug} | ${q.currentStatus} | ${q.priority} | ${q.riskLevel} | ${q.targetMissingCapabilities.slice(0, 3).join("; ")} |`
    );
  }
  lines.push("");

  return lines.join("\n");
}
