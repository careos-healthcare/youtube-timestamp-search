import type { ResearchGraphEdge, ResearchGraphNode } from "./research-graph-types";

export type TopicClusterMetric = {
  topicSlug: string;
  momentCount: number;
  videoCount: number;
  creatorCount: number;
  citationDensity: number;
  compareReadiness: number;
  clusterScore: number;
};

export type ResearchGraphMetrics = {
  nodeCount: number;
  edgeCount: number;
  nodeCountsByKind: Record<string, number>;
  edgeCountsByKind: Record<string, number>;
  topicCoverageDepth: number;
  creatorDiversity: number;
  citationDensity: number;
  explanationDensity: number;
  compareReadiness: number;
  weakContextShare: number;
  orphanMomentCount: number;
  lowTrustClusterCount: number;
  strongestTopicClusters: TopicClusterMetric[];
  enterpriseReadinessScore: number;
  enterpriseReadinessLevel: string;
  enterpriseReadinessNotes: string[];
};

const WEAK_AUTHORITY = new Set([
  "opinion_heavy",
  "entertainment_commentary",
  "unknown_weak_context",
]);

function momentNodes(nodes: ResearchGraphNode[]) {
  return nodes.filter((n) => n.kind === "PublicMoment");
}

function creatorNodes(nodes: ResearchGraphNode[]) {
  return nodes.filter((n) => n.kind === "Creator");
}

function buildTopicClusters(nodes: ResearchGraphNode[], edges: ResearchGraphEdge[]): TopicClusterMetric[] {
  const moments = momentNodes(nodes);
  const byTopic = new Map<string, typeof moments>();

  for (const m of moments) {
    const slug = String(m.properties.topic ?? "uncategorized");
    const list = byTopic.get(slug) ?? [];
    list.push(m);
    byTopic.set(slug, list);
  }

  const compareEdges = edges.filter((e) => e.kind === "compared_with");
  const compareByTopic = new Map<string, number>();
  for (const e of compareEdges) {
    const src = nodes.find((n) => n.id === e.sourceId);
    if (src?.kind === "PublicMoment") {
      const t = String(src.properties.topic);
      compareByTopic.set(t, (compareByTopic.get(t) ?? 0) + 1);
    }
  }

  const clusters: TopicClusterMetric[] = [];
  for (const [slug, list] of byTopic) {
    const videos = new Set(list.map((m) => String(m.properties.videoId)));
    const creators = new Set(
      list
        .map((m) => {
          const vid = String(m.properties.videoId);
          const video = nodes.find((n) => n.kind === "Video" && n.properties.videoId === vid);
          return video ? String(video.properties.channelName) : "";
        })
        .filter(Boolean)
    );
    const citeRich = list.filter((m) => m.properties.citationRich === true).length;
    const n = list.length || 1;
    const compareReadiness = Math.min(1, (compareByTopic.get(slug) ?? 0) / Math.max(1, n * 0.5));
    const citationDensity = citeRich / n;
    const clusterScore =
      citationDensity * 30 +
      Math.min(videos.size / 4, 1) * 25 +
      Math.min(creators.size / 4, 1) * 25 +
      compareReadiness * 20;
    clusters.push({
      topicSlug: slug,
      momentCount: list.length,
      videoCount: videos.size,
      creatorCount: creators.size,
      citationDensity,
      compareReadiness,
      clusterScore: Math.round(clusterScore),
    });
  }

  return clusters.sort((a, b) => b.clusterScore - a.clusterScore);
}

function countOrphanMoments(nodes: ResearchGraphNode[], edges: ResearchGraphEdge[]): number {
  const momentIds = new Set(momentNodes(nodes).map((n) => n.id));
  const connected = new Set<string>();
  for (const e of edges) {
    if (momentIds.has(e.sourceId)) connected.add(e.sourceId);
    if (momentIds.has(e.targetId)) connected.add(e.targetId);
  }
  let orphans = 0;
  for (const id of momentIds) {
    if (!connected.has(id)) orphans += 1;
  }
  return orphans;
}

function lowTrustClusters(clusters: TopicClusterMetric[], nodes: ResearchGraphNode[]): number {
  let count = 0;
  for (const c of clusters) {
    if (c.momentCount < 3) continue;
    const moments = momentNodes(nodes).filter((m) => String(m.properties.topic) === c.topicSlug);
    const weak = moments.filter((m) =>
      WEAK_AUTHORITY.has(String(m.properties.sourceAuthorityLabel))
    ).length;
    if (weak / moments.length > 0.55) count += 1;
  }
  return count;
}

/** Placeholder L0–L5 enterprise readiness from graph shape (not product features). */
export function computeEnterpriseReadinessPlaceholder(metrics: {
  topicCoverageDepth: number;
  creatorDiversity: number;
  citationDensity: number;
  compareReadiness: number;
  weakContextShare: number;
  orphanMomentCount: number;
  momentCount: number;
}): { score: number; level: string; notes: string[] } {
  const notes: string[] = [];
  let score = 0;
  score += Math.min(metrics.topicCoverageDepth / 25, 1) * 20;
  score += Math.min(metrics.creatorDiversity / 20, 1) * 15;
  score += metrics.citationDensity * 25;
  score += metrics.compareReadiness * 20;
  score -= metrics.weakContextShare * 25;
  score -= Math.min(metrics.orphanMomentCount / Math.max(metrics.momentCount, 1), 0.5) * 20;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = "L0 public search prototype";
  if (score >= 75) level = "L4 enterprise research infrastructure (graph-ready)";
  else if (score >= 60) level = "L3 team knowledge workspace (partial)";
  else if (score >= 45) level = "L2 trusted research library (partial)";
  else if (score >= 30) level = "L1 research workflow (partial)";
  else level = "L0 public search prototype";

  if (metrics.citationDensity < 0.2) notes.push("Citation density too low for L2+");
  if (metrics.compareReadiness < 0.15) notes.push("Compare-readiness weak — expand multi-creator topics");
  if (metrics.weakContextShare > 0.4) notes.push("High weak-context share — governance risk");
  if (metrics.orphanMomentCount > metrics.momentCount * 0.2) {
    notes.push("Orphan moments lack graph edges — wire topic/creator/citation links");
  }

  return { score, level, notes };
}

export function computeResearchGraphMetrics(
  nodes: ResearchGraphNode[],
  edges: ResearchGraphEdge[]
): ResearchGraphMetrics {
  const nodeCountsByKind: Record<string, number> = {};
  const edgeCountsByKind: Record<string, number> = {};
  for (const n of nodes) nodeCountsByKind[n.kind] = (nodeCountsByKind[n.kind] ?? 0) + 1;
  for (const e of edges) edgeCountsByKind[e.kind] = (edgeCountsByKind[e.kind] ?? 0) + 1;

  const moments = momentNodes(nodes);
  const creators = creatorNodes(nodes);
  const explanations = nodes.filter((n) => n.kind === "Explanation");

  const momentCount = moments.length || 1;
  const citationDensity = moments.filter((m) => m.properties.citationRich === true).length / momentCount;
  const explanationDensity = explanations.length / momentCount;
  const weakContextShare =
    moments.filter((m) => WEAK_AUTHORITY.has(String(m.properties.sourceAuthorityLabel))).length /
    momentCount;

  const compareEdgeCount = edges.filter((e) => e.kind === "compared_with").length;
  const compareReadiness = Math.min(1, compareEdgeCount / Math.max(1, momentCount * 0.4));

  const clusters = buildTopicClusters(nodes, edges);
  const topicCoverageDepth =
    clusters.filter((c) => c.momentCount >= 2 && c.videoCount >= 2).length;

  const enterprise = computeEnterpriseReadinessPlaceholder({
    topicCoverageDepth,
    creatorDiversity: creators.length,
    citationDensity,
    compareReadiness,
    weakContextShare,
    orphanMomentCount: countOrphanMoments(nodes, edges),
    momentCount: moments.length,
  });

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeCountsByKind,
    edgeCountsByKind,
    topicCoverageDepth,
    creatorDiversity: creators.length,
    citationDensity,
    explanationDensity,
    compareReadiness,
    weakContextShare,
    orphanMomentCount: countOrphanMoments(nodes, edges),
    lowTrustClusterCount: lowTrustClusters(clusters, nodes),
    strongestTopicClusters: clusters.slice(0, 12),
    enterpriseReadinessScore: enterprise.score,
    enterpriseReadinessLevel: enterprise.level,
    enterpriseReadinessNotes: enterprise.notes,
  };
}
