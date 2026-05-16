import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { STATIC_PUBLIC_COLLECTIONS } from "@/lib/collections/static-collections";
import { buildTopicCoverageReport } from "@/lib/corpus/topic-coverage";
import { CREATOR_DATABASE, getCreatorBySlug } from "@/lib/creator-data";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { evaluatePublicMoment } from "@/lib/quality";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import { comparePublicMomentsForTopic } from "@/lib/research/compare-explanations";
import { evaluateSourceAuthorityForPublicMoment } from "@/lib/research/source-authority";
import { listTopicHubs } from "@/lib/topics/topic-index";

import { computeResearchGraphMetrics, type ResearchGraphMetrics } from "./research-graph-metrics";
import type {
  ResearchGraphEdge,
  ResearchGraphNode,
  ResearchGraphSnapshot,
} from "./research-graph-types";

function slugifyChannel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function matchCreatorSlug(channelName?: string): string | null {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return null;
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) return c.slug;
    if (c.aliases.some((a) => a.toLowerCase() === ch)) return c.slug;
  }
  return slugifyChannel(ch);
}

type ResearchGradeRow = {
  canonicalSlug: string;
  tier: string;
  metrics: { researchGradeScore: number };
};

function loadResearchGradeTopics(): Map<string, ResearchGradeRow> {
  const path = join(process.cwd(), "data", "research-grade-topic-report.json");
  const map = new Map<string, ResearchGradeRow>();
  if (!existsSync(path)) return map;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as { topics?: ResearchGradeRow[] };
    for (const row of raw.topics ?? []) {
      map.set(row.canonicalSlug, row);
    }
  } catch {
    // ignore
  }
  return map;
}

export type BuildResearchGraphInput = {
  moments: PublicMomentRecord[];
};

export function buildResearchGraph(input: BuildResearchGraphInput): ResearchGraphSnapshot & {
  metrics: ResearchGraphMetrics;
} {
  const { moments } = input;
  const nodes: ResearchGraphNode[] = [];
  const edges: ResearchGraphEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (edge: Omit<ResearchGraphEdge, "id"> & { id?: string }) => {
    const id = edge.id ?? `${edge.kind}:${edge.sourceId}->${edge.targetId}`;
    const key = id;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ ...edge, id });
  };

  const sourceId = "source:youtube";
  nodes.push({
    id: sourceId,
    kind: "Source",
    label: "YouTube",
    properties: { sourceType: "youtube", platform: "youtube", trustTier: "platform_prior" },
  });

  buildTopicCoverageReport(moments);
  const researchGradeBySlug = loadResearchGradeTopics();
  const hubs = listTopicHubs();
  const hubBySlug = new Map(hubs.map((h) => [h.slug, h]));

  const videoIds = new Set<string>();
  const topicSlugs = new Set<string>();
  const creatorSlugs = new Set<string>();

  for (const m of moments) {
    videoIds.add(m.videoId);
    if (m.topic) topicSlugs.add(m.topic);
  }

  for (const videoId of videoIds) {
    const sample = moments.find((m) => m.videoId === videoId)!;
    const vid = `video:${videoId}`;
    nodes.push({
      id: vid,
      kind: "Video",
      label: sample.videoTitle ?? videoId,
      properties: {
        videoId,
        title: sample.videoTitle ?? videoId,
        channelName: sample.channelName ?? "",
        youtubeUrl: sample.youtubeUrl,
      },
    });
    addEdge({
      kind: "source_context",
      sourceId: vid,
      targetId: sourceId,
      weight: 1,
      properties: { platform: "youtube" },
    });

    const cSlug = matchCreatorSlug(sample.channelName);
    if (cSlug) {
      creatorSlugs.add(cSlug);
      const creator = getCreatorBySlug(cSlug);
      const cid = `creator:${cSlug}`;
      if (!nodes.some((n) => n.id === cid)) {
        nodes.push({
          id: cid,
          kind: "Creator",
          label: creator?.displayName ?? cSlug,
          properties: {
            slug: cSlug,
            displayName: creator?.displayName ?? sample.channelName ?? cSlug,
            category: creator?.category ?? null,
          },
        });
      }
      addEdge({
        kind: "created_by",
        sourceId: vid,
        targetId: cid,
        weight: 1,
        properties: {},
      });
    }
  }

  for (const slug of topicSlugs) {
    const tid = `topic:${slug}`;
    const hub = hubBySlug.get(slug);
    const rg = researchGradeBySlug.get(slug);
    const momentCount = moments.filter((m) => m.topic === slug).length;
    nodes.push({
      id: tid,
      kind: "Topic",
      label: hub?.displayTitle ?? slug,
      properties: {
        slug,
        researchGradeTier: rg?.tier ?? null,
        momentCount,
        hubQuality: hub?.quality ?? null,
      },
    });
  }

  const collectionMomentEdges: Array<{ mid: string; cid: string }> = [];
  for (const col of STATIC_PUBLIC_COLLECTIONS) {
    const cid = `collection:${col.slug}`;
    const resolved = col.momentIds.filter((id) => moments.some((m) => m.id === id));
    nodes.push({
      id: cid,
      kind: "Collection",
      label: col.title,
      properties: { slug: col.slug, momentCount: resolved.length },
    });
    for (const t of col.relatedTopicSlugs) {
      if (topicSlugs.has(t)) {
        addEdge({
          kind: "same_topic_as",
          sourceId: cid,
          targetId: `topic:${t}`,
          weight: 0.8,
          properties: { via: "collection" },
        });
      }
    }
    for (const mid of resolved) {
      collectionMomentEdges.push({ mid, cid });
    }
  }

  const momentsByTopic = new Map<string, PublicMomentRecord[]>();
  for (const m of moments) {
    const t = m.topic ?? "uncategorized";
    const list = momentsByTopic.get(t) ?? [];
    list.push(m);
    momentsByTopic.set(t, list);
  }

  for (const m of moments) {
    const mid = `moment:${m.id}`;
    const vid = `video:${m.videoId}`;
    const segId = `segment:${m.videoId}:${m.startSeconds}`;
    const authority = evaluateSourceAuthorityForPublicMoment(m);
    const quality = evaluatePublicMoment(m);
    const citeRich = isPublicMomentCitationRich(m);
    const topicSlug = m.topic ?? "uncategorized";
    const tid = `topic:${topicSlug}`;

    nodes.push({
      id: mid,
      kind: "PublicMoment",
      label: m.phrase.slice(0, 80),
      properties: {
        momentId: m.id,
        videoId: m.videoId,
        topic: topicSlug,
        qualityTier: quality.qualityTier,
        citationRich: citeRich,
        sourceAuthorityLabel: authority.sourceAuthorityLabel,
      },
    });

    if (!nodes.some((n) => n.id === segId)) {
      nodes.push({
        id: segId,
        kind: "TranscriptSegment",
        label: `Segment @ ${m.timestamp}`,
        properties: {
          videoId: m.videoId,
          startSeconds: m.startSeconds,
          anchorMomentId: m.id,
        },
      });
    }

    const cls = classifyExplanationFromText({
      phrase: m.phrase,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    });

    const explId = `explanation:${m.id}`;
    nodes.push({
      id: explId,
      kind: "Explanation",
      label: `Explanation — ${m.phrase.slice(0, 48)}`,
      properties: {
        anchorMomentId: m.id,
        framing: cls.primary ?? "mixed",
        beginnerLikelihood: cls.beginnerLikelihood,
        technicalLikelihood: cls.technicalLikelihood,
      },
    });

    const claimId = `claim:${m.id}`;
    nodes.push({
      id: claimId,
      kind: "ClaimLikeStatement",
      label: m.phrase.slice(0, 72),
      properties: {
        anchorMomentId: m.id,
        phrase: m.phrase,
        confidence: cls.primarySourceLikelihood >= 1 ? "higher" : "heuristic",
      },
    });

    if (citeRich) {
      const citId = `citation:${m.id}`;
      nodes.push({
        id: citId,
        kind: "Citation",
        label: `Citation — ${m.id}`,
        properties: {
          anchorMomentId: m.id,
          hasMarkdown: Boolean(m.semantic?.citations?.markdown),
          hasAcademic: Boolean(m.semantic?.citations?.academic),
        },
      });
      addEdge({ kind: "cites", sourceId: citId, targetId: mid, weight: 1, properties: {} });
      addEdge({ kind: "cites", sourceId: mid, targetId: vid, weight: 0.9, properties: {} });
    }

    addEdge({ kind: "clipped_from", sourceId: mid, targetId: segId, weight: 1, properties: {} });
    addEdge({ kind: "clipped_from", sourceId: segId, targetId: vid, weight: 1, properties: {} });
    addEdge({ kind: "explains", sourceId: explId, targetId: tid, weight: 1, properties: {} });
    addEdge({ kind: "explains", sourceId: mid, targetId: tid, weight: 0.85, properties: {} });
    addEdge({ kind: "source_context", sourceId: mid, targetId: sourceId, weight: 1, properties: {} });

    const cSlug = matchCreatorSlug(m.channelName);
    if (cSlug) {
      addEdge({
        kind: "created_by",
        sourceId: mid,
        targetId: `creator:${cSlug}`,
        weight: 1,
        properties: {},
      });
    }

    if (cls.counterLikelihood >= 1) {
      const peers = (momentsByTopic.get(topicSlug) ?? []).filter((p) => p.id !== m.id).slice(0, 3);
      for (const p of peers) {
        addEdge({
          kind: "contradicts_or_caveats",
          sourceId: mid,
          targetId: `moment:${p.id}`,
          weight: 0.7,
          properties: { heuristic: true },
        });
      }
    } else {
      const peers = (momentsByTopic.get(topicSlug) ?? [])
        .filter((p) => p.id !== m.id && p.videoId !== m.videoId)
        .slice(0, 2);
      for (const p of peers) {
        addEdge({
          kind: "supports",
          sourceId: mid,
          targetId: `moment:${p.id}`,
          weight: 0.5,
          properties: { sameTopic: topicSlug },
        });
      }
    }
  }

  for (const { mid, cid } of collectionMomentEdges) {
    addEdge({
      kind: "saved_in",
      sourceId: `moment:${mid}`,
      targetId: cid,
      weight: 1,
      properties: { curated: true },
    });
  }

  for (const [topicSlug, list] of momentsByTopic) {
    const compareRows = comparePublicMomentsForTopic(list, topicSlug, 6);
    const compareIds = new Set(compareRows.map((r) => r.moment.id));
    const ids = [...compareIds];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge({
          kind: "compared_with",
          sourceId: `moment:${ids[i]}`,
          targetId: `moment:${ids[j]}`,
          weight: 1,
          properties: { topic: topicSlug },
        });
      }
    }
  }

  const topicList = [...topicSlugs];
  for (let i = 0; i < topicList.length; i++) {
    for (let j = i + 1; j < topicList.length; j++) {
      const a = topicList[i]!;
      const b = topicList[j]!;
      const hubA = hubBySlug.get(a);
      const hubB = hubBySlug.get(b);
      if (hubA?.pillar && hubA.pillar === hubB?.pillar) {
        addEdge({
          kind: "same_topic_as",
          sourceId: `topic:${a}`,
          targetId: `topic:${b}`,
          weight: 0.4,
          properties: { pillar: hubA.pillar },
        });
      }
    }
  }

  const metrics = computeResearchGraphMetrics(nodes, edges);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    metrics,
  };
}

export function formatResearchGraphMarkdown(
  snapshot: ResearchGraphSnapshot & { metrics: ResearchGraphMetrics }
): string {
  const m = snapshot.metrics;
  const clusterRows = m.strongestTopicClusters
    .slice(0, 10)
    .map(
      (c) =>
        `| ${c.topicSlug} | ${c.momentCount} | ${c.videoCount} | ${c.creatorCount} | ${(c.citationDensity * 100).toFixed(0)}% | ${c.clusterScore} |`
    )
    .join("\n");

  return `# Research graph report

Generated: ${snapshot.generatedAt}

Cross-source spoken knowledge as a **research graph** (nodes + edges), not isolated pages.

## Graph size

| Metric | Value |
|--------|------:|
| Nodes | ${m.nodeCount} |
| Edges | ${m.edgeCount} |
| Public moments | ${m.nodeCountsByKind.PublicMoment ?? 0} |
| Topics | ${m.nodeCountsByKind.Topic ?? 0} |
| Creators | ${m.nodeCountsByKind.Creator ?? 0} |

## Quality metrics

| Metric | Value |
|--------|------:|
| Topic coverage depth (multi-video topics) | ${m.topicCoverageDepth} |
| Creator diversity | ${m.creatorDiversity} |
| Citation density | ${(m.citationDensity * 100).toFixed(1)}% |
| Explanation density | ${(m.explanationDensity * 100).toFixed(1)}% |
| Compare-readiness | ${(m.compareReadiness * 100).toFixed(1)}% |
| Weak-context share | ${(m.weakContextShare * 100).toFixed(1)}% |
| Orphan moments | ${m.orphanMomentCount} |
| Low-trust clusters | ${m.lowTrustClusterCount} |

## Enterprise readiness (placeholder)

| Field | Value |
|-------|-------|
| Score (0–100) | ${m.enterpriseReadinessScore} |
| Level | ${m.enterpriseReadinessLevel} |

${m.enterpriseReadinessNotes.map((n) => `- ${n}`).join("\n") || "_No blockers flagged._"}

## Strongest topic clusters

| Topic | Moments | Videos | Creators | Cite % | Score |
|-------|--------:|-------:|---------:|-------:|------:|
${clusterRows || "| — | — | — | — | — | — |"}

## Edge distribution

${Object.entries(m.edgeCountsByKind)
  .map(([k, v]) => `- \`${k}\`: ${v}`)
  .join("\n")}

## Regenerate

\`\`\`bash
npm run report:research-graph
\`\`\`

See \`PLATFORM_ARCHITECTURE_ROADMAP.md\` and \`ENTERPRISE_RESEARCH_TOOLING_RUBRIC.md\`.
`;
}
