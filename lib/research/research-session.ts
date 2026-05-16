/**
 * Research session model — deterministic metrics for repeat research workflows.
 * Pure functions only (no browser / DB).
 */

export const RESEARCH_SESSION_ANALYTICS_EVENTS = [
  "research_session_started",
  "research_session_extended",
  "research_compare_used",
  "research_chain_depth",
  "repeat_topic_research",
  "citation_workflow_completed",
  "saved_research_return",
  "collection_revisit",
  "research_export_completed",
] as const;

export type ResearchSessionAnalyticsEventName =
  (typeof RESEARCH_SESSION_ANALYTICS_EVENTS)[number];

export type ResearchWorkflowCohort =
  | "bounce"
  | "casual_lookup"
  | "active_explorer"
  | "researcher"
  | "repeat_researcher";

export type ResearchSessionEventRow = {
  eventName: string;
  createdAt: string;
  sessionId: string;
  query: string | null;
  videoId: string | null;
  payload: Record<string, unknown>;
};

export type ResearchSessionMetrics = {
  sessionId: string;
  firstQuery: string | null;
  queryChain: string[];
  topicChain: string[];
  compareActions: number;
  citationExports: number;
  saveActions: number;
  revisitActions: number;
  collectionVisits: number;
  collectionRevisits: number;
  exportActions: number;
  topicDepth: number;
  uniqueTopics: number;
  repeatedTopicInteractions: number;
  researchDepthScore: number;
  repeatResearchBehavior: boolean;
  cohort: ResearchWorkflowCohort;
  startedAt: string;
  endedAt: string;
  eventCount: number;
};

function normQuery(q: string | null | undefined): string | null {
  const t = q?.trim().toLowerCase();
  return t || null;
}

function normTopic(t: string | null | undefined): string | null {
  const s = t?.trim().toLowerCase();
  return s || null;
}

/** Explicit depth formula (0–100). See RESEARCH_WORKFLOW_METRICS.md. */
export function calculateResearchDepthScore(input: {
  queryChainLength: number;
  topicChainLength: number;
  compareActions: number;
  citationExports: number;
  saveActions: number;
  revisitActions: number;
  collectionVisits: number;
  exportActions: number;
  repeatedTopicInteractions: number;
}): number {
  const queryPts = Math.min(input.queryChainLength, 6) * 12;
  const topicPts = Math.min(input.topicChainLength, 5) * 10;
  const comparePts = input.compareActions > 0 ? 15 : 0;
  const citePts = Math.min(input.citationExports, 3) * 12;
  const savePts = Math.min(input.saveActions, 2) * 14;
  const revisitPts = input.revisitActions > 0 ? 18 : 0;
  const collectionPts = Math.min(input.collectionVisits, 2) * 8;
  const exportPts = input.exportActions > 0 ? 12 : 0;
  const repeatPts = input.repeatedTopicInteractions > 0 ? 10 : 0;
  return Math.min(
    100,
    Math.round(
      queryPts +
        topicPts +
        comparePts +
        citePts +
        savePts +
        revisitPts +
        collectionPts +
        exportPts +
        repeatPts
    )
  );
}

export function detectRepeatResearchBehavior(metrics: {
  queryChain: string[];
  topicChain: string[];
  repeatedTopicInteractions: number;
  revisitActions: number;
  saveActions: number;
}): boolean {
  if (metrics.repeatedTopicInteractions > 0) return true;
  const topicSet = new Set(metrics.topicChain);
  if (metrics.topicChain.length >= 2 && topicSet.size < metrics.topicChain.length) return true;
  const querySet = new Set(metrics.queryChain);
  if (metrics.queryChain.length >= 2 && querySet.size < metrics.queryChain.length) return true;
  if (metrics.revisitActions > 0 && metrics.saveActions > 0) return true;
  return false;
}

/** Deterministic cohort rules — evaluated in priority order. */
export function classifyResearchWorkflowCohort(
  metrics: Omit<ResearchSessionMetrics, "cohort">
): ResearchWorkflowCohort {
  const depth = metrics.researchDepthScore;
  const repeat = metrics.repeatResearchBehavior;

  if (repeat && depth >= 45) return "repeat_researcher";

  if (
    depth >= 60 &&
    (metrics.citationExports > 0 ||
      metrics.saveActions > 0 ||
      metrics.queryChain.length >= 2 ||
      metrics.exportActions > 0)
  ) {
    return "researcher";
  }

  if (
    depth >= 35 &&
    depth < 60 &&
    (metrics.topicChain.length >= 2 ||
      metrics.compareActions > 0 ||
      metrics.collectionVisits > 0 ||
      metrics.queryChain.length >= 2)
  ) {
    return "active_explorer";
  }

  if (
    depth < 15 &&
    metrics.compareActions === 0 &&
    metrics.citationExports === 0 &&
    metrics.saveActions === 0 &&
    metrics.queryChain.length <= 1 &&
    metrics.topicChain.length <= 1
  ) {
    return "bounce";
  }

  return "casual_lookup";
}

export function researchSessionIdFromRow(row: {
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
  query?: string | null;
}): string {
  const payload = row.payload ?? {};
  if (typeof payload.researchSessionId === "string" && payload.researchSessionId.length > 0) {
    return payload.researchSessionId;
  }
  if (typeof payload.sessionId === "string" && payload.sessionId.length > 0) {
    return `search:${payload.sessionId}`;
  }
  const bucket = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const minuteBucket = Math.floor(bucket / (15 * 60 * 1000));
  const querySeed = (row.query ?? "anon").slice(0, 24);
  return `time:${minuteBucket}:${querySeed}`;
}

export function buildResearchSessionMetrics(
  sessionId: string,
  events: ResearchSessionEventRow[]
): ResearchSessionMetrics {
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let firstQuery: string | null = null;
  const queryChain: string[] = [];
  const topicChain: string[] = [];
  const topicCounts = new Map<string, number>();
  let compareActions = 0;
  let citationExports = 0;
  let saveActions = 0;
  let revisitActions = 0;
  let collectionVisits = 0;
  let collectionRevisits = 0;
  let exportActions = 0;

  for (const event of sorted) {
    const p = event.payload;
    const q =
      normQuery(event.query) ??
      normQuery(typeof p.query === "string" ? p.query : null) ??
      normQuery(typeof p.previousQuery === "string" ? p.previousQuery : null);
    const topic =
      normTopic(typeof p.topicSlug === "string" ? p.topicSlug : null) ??
      normTopic(typeof p.topic === "string" ? p.topic : null);

    if (q) {
      if (!firstQuery) firstQuery = q;
      if (!queryChain.includes(q)) queryChain.push(q);
    }
    if (topic) {
      if (!topicChain.includes(topic)) topicChain.push(topic);
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }

    switch (event.eventName) {
      case "research_compare_used":
      case "compare_explanations_view":
      case "compare_explanation_click":
        compareActions += 1;
        break;
      case "citation_workflow_completed":
      case "moment_citation_copy":
      case "moment_embed_copy":
        citationExports += 1;
        break;
      case "saved_clip":
      case "first_clip_saved":
        saveActions += 1;
        break;
      case "saved_research_return":
        revisitActions += 1;
        break;
      case "saved_page_open":
        if (p.returnVisit === true || (typeof p.clipCount === "number" && p.clipCount > 0)) {
          revisitActions += 1;
        }
        break;
      case "collection_revisit":
        collectionRevisits += 1;
        collectionVisits += 1;
        break;
      case "collection_page_view":
        collectionVisits += 1;
        break;
      case "research_export_completed":
      case "saved_library_export":
        exportActions += 1;
        break;
      case "repeat_topic_research":
        break;
      default:
        break;
    }

    if (event.eventName === "repeat_topic_research" && topic) {
      topicCounts.set(topic, Math.max(2, (topicCounts.get(topic) ?? 0) + 1));
    }

    if (event.eventName === "research_session_started" && q && !firstQuery) {
      firstQuery = q;
    }
    if (event.eventName === "search_reformulation" && q) {
      const pq = normQuery(typeof p.previousQuery === "string" ? p.previousQuery : null);
      if (pq && !queryChain.includes(pq)) queryChain.push(pq);
      if (q && !queryChain.includes(q)) queryChain.push(q);
    }
    if (
      ["topic_page_view", "topic_moment_click", "topic_related_click", "topic_search_click"].includes(
        event.eventName
      ) &&
      topic
    ) {
      if (!topicChain.includes(topic)) topicChain.push(topic);
    }
    if (event.eventName === "continue_exploring_click" && q && !queryChain.includes(q)) {
      queryChain.push(q);
    }
  }

  // Dedupe query chain after reformulation handling
  const dedupedQueries = [...new Set(queryChain.filter(Boolean))];
  const repeatedTopicInteractions = [...topicCounts.values()].filter((c) => c >= 2).length;

  const researchDepthScore = calculateResearchDepthScore({
    queryChainLength: dedupedQueries.length,
    topicChainLength: topicChain.length,
    compareActions,
    citationExports,
    saveActions,
    revisitActions,
    collectionVisits,
    exportActions,
    repeatedTopicInteractions,
  });

  const repeatResearchBehavior = detectRepeatResearchBehavior({
    queryChain: dedupedQueries,
    topicChain,
    repeatedTopicInteractions,
    revisitActions,
    saveActions,
  });

  const base = {
    sessionId,
    firstQuery,
    queryChain: dedupedQueries,
    topicChain,
    compareActions,
    citationExports,
    saveActions,
    revisitActions,
    collectionVisits,
    collectionRevisits,
    exportActions,
    topicDepth: topicChain.length,
    uniqueTopics: new Set(topicChain).size,
    repeatedTopicInteractions,
    researchDepthScore,
    repeatResearchBehavior,
    startedAt: sorted[0]?.createdAt ?? new Date().toISOString(),
    endedAt: sorted[sorted.length - 1]?.createdAt ?? new Date().toISOString(),
    eventCount: sorted.length,
  };

  return {
    ...base,
    cohort: classifyResearchWorkflowCohort({ ...base, repeatResearchBehavior, researchDepthScore }),
  };
}

export function groupResearchSessionEvents(
  events: ResearchSessionEventRow[]
): Map<string, ResearchSessionEventRow[]> {
  const map = new Map<string, ResearchSessionEventRow[]>();
  for (const event of events) {
    const bucket = map.get(event.sessionId) ?? [];
    bucket.push(event);
    map.set(event.sessionId, bucket);
  }
  return map;
}
