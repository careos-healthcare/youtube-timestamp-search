import { getSupabaseAdminClient } from "@/lib/supabase";

import {
  buildResearchSessionMetrics,
  groupResearchSessionEvents,
  researchSessionIdFromRow,
  type ResearchSessionEventRow,
  type ResearchSessionMetrics,
  type ResearchWorkflowCohort,
} from "./research-session";

/** Events used to reconstruct research sessions (new + legacy with researchSessionId). */
export const RESEARCH_SESSION_LOAD_EVENTS = [
  "research_session_started",
  "research_session_extended",
  "research_compare_used",
  "research_chain_depth",
  "repeat_topic_research",
  "citation_workflow_completed",
  "saved_research_return",
  "collection_revisit",
  "research_export_completed",
  "topic_page_view",
  "topic_moment_click",
  "topic_related_click",
  "topic_search_click",
  "topic_creator_click",
  "compare_explanations_view",
  "compare_explanation_click",
  "moment_citation_copy",
  "moment_embed_copy",
  "saved_clip",
  "first_clip_saved",
  "saved_page_open",
  "saved_library_export",
  "collection_page_view",
  "search_reformulation",
  "research_answer_view",
  "research_explanation_click",
  "continue_exploring_click",
  "canonical_moment_related_click",
] as const;

export type ResearchSessionAggregation = {
  generatedAt: string;
  eventsAnalyzed: number;
  sessionsAnalyzed: number;
  averageResearchDepth: number;
  repeatTopicRate: number;
  compareUsageRate: number;
  saveReturnRate: number;
  citationWorkflowCompletionRate: number;
  collectionRevisitRate: number;
  avgQueryChainLength: number;
  avgTopicChainLength: number;
  cohortCounts: Record<ResearchWorkflowCohort, number>;
  cohortShares: Record<ResearchWorkflowCohort, number>;
  shallowSeoProxyRate: number;
  seriousResearchProxyRate: number;
  sessions: ResearchSessionMetrics[];
};

export async function loadResearchSessionEvents(limit = 8000): Promise<ResearchSessionEventRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("search_analytics_events")
    .select("event_name, query, video_id, payload, created_at")
    .in("event_name", [...RESEARCH_SESSION_LOAD_EVENTS])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    eventName: row.event_name,
    query: row.query,
    videoId: row.video_id,
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    createdAt: row.created_at ?? new Date().toISOString(),
    sessionId: researchSessionIdFromRow({
      payload: row.payload as Record<string, unknown> | null,
      created_at: row.created_at,
      query: row.query,
    }),
  }));
}

export function aggregateResearchSessions(
  events: ResearchSessionEventRow[]
): ResearchSessionAggregation {
  const grouped = groupResearchSessionEvents(events);
  const sessions: ResearchSessionMetrics[] = [];

  for (const [sessionId, sessionEvents] of grouped) {
    const hasResearchMarker =
      sessionEvents.some((e) => e.eventName.startsWith("research_")) ||
      sessionEvents.some((e) => typeof e.payload.researchSessionId === "string");
    if (!hasResearchMarker && sessionId.startsWith("time:")) {
      continue;
    }
    sessions.push(buildResearchSessionMetrics(sessionId, sessionEvents));
  }

  const n = sessions.length || 1;
  const withCompare = sessions.filter((s) => s.compareActions > 0).length;
  const withSave = sessions.filter((s) => s.saveActions > 0).length;
  const withReturn = sessions.filter((s) => s.revisitActions > 0).length;
  const withCitation = sessions.filter((s) => s.citationExports > 0).length;
  const withCollectionRevisit = sessions.filter((s) => s.collectionRevisits > 0).length;
  const withRepeatTopic = sessions.filter((s) => s.repeatedTopicInteractions > 0).length;

  const cohortCounts: Record<ResearchWorkflowCohort, number> = {
    bounce: 0,
    casual_lookup: 0,
    active_explorer: 0,
    researcher: 0,
    repeat_researcher: 0,
  };
  for (const s of sessions) cohortCounts[s.cohort] += 1;

  const cohortShares = Object.fromEntries(
    Object.entries(cohortCounts).map(([k, v]) => [k, sessions.length ? v / sessions.length : 0])
  ) as Record<ResearchWorkflowCohort, number>;

  const shallowSeoProxyRate =
    sessions.length ? (cohortCounts.bounce + cohortCounts.casual_lookup) / sessions.length : 0;
  const seriousResearchProxyRate =
    sessions.length
      ? (cohortCounts.researcher + cohortCounts.repeat_researcher + cohortCounts.active_explorer) /
        sessions.length
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    eventsAnalyzed: events.length,
    sessionsAnalyzed: sessions.length,
    averageResearchDepth:
      sessions.length
        ? sessions.reduce((sum, s) => sum + s.researchDepthScore, 0) / sessions.length
        : 0,
    repeatTopicRate: withRepeatTopic / n,
    compareUsageRate: withCompare / n,
    saveReturnRate: withSave > 0 ? withReturn / withSave : 0,
    citationWorkflowCompletionRate: withCitation / n,
    collectionRevisitRate: withCollectionRevisit / n,
    avgQueryChainLength:
      sessions.length ? sessions.reduce((sum, s) => sum + s.queryChain.length, 0) / sessions.length : 0,
    avgTopicChainLength:
      sessions.length ? sessions.reduce((sum, s) => sum + s.topicChain.length, 0) / sessions.length : 0,
    cohortCounts,
    cohortShares,
    shallowSeoProxyRate,
    seriousResearchProxyRate,
    sessions,
  };
}

export async function buildResearchSessionReport(): Promise<ResearchSessionAggregation> {
  const events = await loadResearchSessionEvents();
  return aggregateResearchSessions(events);
}

export function formatResearchSessionReportMarkdown(report: ResearchSessionAggregation): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return `# Research session report

Generated: ${report.generatedAt}

## Purpose

Distinguish **shallow SEO traffic** (single query, no workflow signals) from **serious research behavior** (chains, compare, citations, saves, returns).

## Summary

| Metric | Value |
|--------|------:|
| Events analyzed | ${report.eventsAnalyzed} |
| Sessions analyzed | ${report.sessionsAnalyzed} |
| Average research depth (0–100) | ${report.averageResearchDepth.toFixed(1)} |
| Repeat topic rate | ${pct(report.repeatTopicRate)} |
| Compare usage rate | ${pct(report.compareUsageRate)} |
| Save → return rate | ${pct(report.saveReturnRate)} |
| Citation workflow completion rate | ${pct(report.citationWorkflowCompletionRate)} |
| Collection revisit rate | ${pct(report.collectionRevisitRate)} |
| Avg query chain length | ${report.avgQueryChainLength.toFixed(2)} |
| Avg topic chain length | ${report.avgTopicChainLength.toFixed(2)} |
| Shallow SEO proxy (bounce + casual) | ${pct(report.shallowSeoProxyRate)} |
| Serious research proxy (explorer + researcher + repeat) | ${pct(report.seriousResearchProxyRate)} |

## Workflow cohorts

| Cohort | Sessions | Share |
|--------|----------:|------:|
| bounce | ${report.cohortCounts.bounce} | ${pct(report.cohortShares.bounce)} |
| casual_lookup | ${report.cohortCounts.casual_lookup} | ${pct(report.cohortShares.casual_lookup)} |
| active_explorer | ${report.cohortCounts.active_explorer} | ${pct(report.cohortShares.active_explorer)} |
| researcher | ${report.cohortCounts.researcher} | ${pct(report.cohortShares.researcher)} |
| repeat_researcher | ${report.cohortCounts.repeat_researcher} | ${pct(report.cohortShares.repeat_researcher)} |

## Interpretation

- **High shallow SEO proxy** → landing traffic without multi-step research workflows; optimize topic hubs and first-click depth before scaling acquisition.
- **Rising repeat_researcher + citation completion** → evidence of behavioral lock-in (users return to topics and export citations).
- **Low save→return** → library feature may not yet close the loop; revisit saved-page prompts.

## Regenerate

\`\`\`bash
npm run report:research-sessions
\`\`\`

See \`RESEARCH_WORKFLOW_METRICS.md\` for depth scoring rules and limitations.
`;
}
