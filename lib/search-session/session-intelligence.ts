import { getSupabaseAdminClient } from "@/lib/supabase";

export type SessionAnalyticsEvent = {
  eventName: string;
  query: string | null;
  videoId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  sessionId: string;
};

export type SearchSession = {
  sessionId: string;
  events: SessionAnalyticsEvent[];
  queries: string[];
  startedAt: string;
  endedAt: string;
};

export type SessionIntelligenceSignals = {
  reformulationCount: number;
  pogoStickCount: number;
  abandonmentCount: number;
  successfulAnswerSessions: number;
  totalSessions: number;
  avgQueriesPerSession: number;
};

const SESSION_EVENTS = [
  "search_query",
  "homepage_search",
  "search_submitted",
  "indexed_transcript_search",
  "search_reformulation",
  "search_pogo_stick",
  "search_abandon",
  "search_answer_success",
  "search_dwell",
  "youtube_open",
  "youtube_timestamp_click",
  "search_result_click",
  "result_click",
  "search_zero_results",
  "no_results",
  "result_feedback",
] as const;

function sessionIdFromRow(row: {
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
  query?: string | null;
}) {
  const payload = row.payload ?? {};
  if (typeof payload.sessionId === "string" && payload.sessionId.length > 0) {
    return payload.sessionId;
  }
  const bucket = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const minuteBucket = Math.floor(bucket / (15 * 60 * 1000));
  const querySeed = (row.query ?? "anon").slice(0, 24);
  return `time:${minuteBucket}:${querySeed}`;
}

export async function loadSessionAnalyticsEvents(limit = 5000) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [] as SessionAnalyticsEvent[];

  const { data, error } = await supabase
    .from("search_analytics_events")
    .select("event_name, query, video_id, payload, created_at")
    .in("event_name", [...SESSION_EVENTS])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    eventName: row.event_name,
    query: row.query,
    videoId: row.video_id,
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    createdAt: row.created_at ?? new Date().toISOString(),
    sessionId: sessionIdFromRow({
      payload: row.payload as Record<string, unknown> | null,
      created_at: row.created_at,
      query: row.query,
    }),
  }));
}

export function groupEventsIntoSessions(events: SessionAnalyticsEvent[]): SearchSession[] {
  const map = new Map<string, SessionAnalyticsEvent[]>();

  for (const event of events) {
    const bucket = map.get(event.sessionId) ?? [];
    bucket.push(event);
    map.set(event.sessionId, bucket);
  }

  return [...map.entries()].map(([sessionId, sessionEvents]) => {
    const queries = [
      ...new Set(
        sessionEvents
          .map((event) => event.query?.trim().toLowerCase())
          .filter((query): query is string => Boolean(query))
      ),
    ];

    return {
      sessionId,
      events: sessionEvents,
      queries,
      startedAt: sessionEvents[0]?.createdAt ?? new Date().toISOString(),
      endedAt: sessionEvents[sessionEvents.length - 1]?.createdAt ?? new Date().toISOString(),
    };
  });
}

export function analyzeSession(session: SearchSession) {
  const searchEvents = session.events.filter((event) =>
    ["search_query", "homepage_search", "search_submitted", "indexed_transcript_search", "search_reformulation"].includes(
      event.eventName
    )
  );
  const clickEvents = session.events.filter((event) =>
    ["youtube_open", "youtube_timestamp_click", "search_result_click", "result_click"].includes(event.eventName)
  );
  const explicitReformulations = session.events.filter((event) => event.eventName === "search_reformulation").length;
  const explicitPogo = session.events.filter((event) => event.eventName === "search_pogo_stick").length;
  const explicitAbandon = session.events.filter((event) => event.eventName === "search_abandon").length;
  const explicitSuccess = session.events.filter((event) => event.eventName === "search_answer_success").length;

  const reformulationCount = Math.max(explicitReformulations, Math.max(0, session.queries.length - 1));
  const pogoStickCount =
    explicitPogo +
    (searchEvents.length >= 2 && clickEvents.length === 0 ? 1 : 0) +
    (session.events.some((event) => event.eventName === "search_zero_results") && searchEvents.length >= 2 ? 1 : 0);

  const abandonmentCount =
    explicitAbandon + (searchEvents.length > 0 && clickEvents.length === 0 && reformulationCount === 0 ? 1 : 0);

  const successfulAnswerSessions =
    explicitSuccess > 0 ||
    (clickEvents.length > 0 &&
      session.events.some((event) => event.payload.surface === "best_answer" || event.payload.answerMode === "answer"))
      ? 1
      : 0;

  return {
    reformulationCount,
    pogoStickCount,
    abandonmentCount,
    successfulAnswerSessions,
    queryCount: session.queries.length,
    clickCount: clickEvents.length,
  };
}

export function buildSessionIntelligenceSignals(sessions: SearchSession[]): SessionIntelligenceSignals {
  if (sessions.length === 0) {
    return {
      reformulationCount: 0,
      pogoStickCount: 0,
      abandonmentCount: 0,
      successfulAnswerSessions: 0,
      totalSessions: 0,
      avgQueriesPerSession: 0,
    };
  }

  const totals = sessions.map(analyzeSession);
  const queryCount = totals.reduce((sum, item) => sum + item.queryCount, 0);

  return {
    reformulationCount: totals.reduce((sum, item) => sum + item.reformulationCount, 0),
    pogoStickCount: totals.reduce((sum, item) => sum + item.pogoStickCount, 0),
    abandonmentCount: totals.reduce((sum, item) => sum + item.abandonmentCount, 0),
    successfulAnswerSessions: totals.reduce((sum, item) => sum + item.successfulAnswerSessions, 0),
    totalSessions: sessions.length,
    avgQueriesPerSession: Number((queryCount / sessions.length).toFixed(2)),
  };
}
