"use client";

/**
 * Browser session state for research workflow instrumentation.
 */

import { trackPersistentEvent } from "@/lib/analytics";
import type { AnalyticsEventName } from "@/lib/analytics";

const STORAGE_KEY = "youtube-timestamp-search:research-session";

type StoredResearchSession = {
  sessionId: string;
  startedAt: string;
  firstQuery: string | null;
  queryChain: string[];
  topicChain: string[];
  collectionSlugs: string[];
  topicInteractionCounts: Record<string, number>;
  compareActions: number;
  citationExports: number;
  saveActions: number;
  revisitActions: number;
  exportActions: number;
  startedEventSent: boolean;
};

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStore(): StoredResearchSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredResearchSession;
  } catch {
    return null;
  }
}

function writeStore(session: StoredResearchSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // quota / private mode
  }
}

function emptySession(): StoredResearchSession {
  return {
    sessionId: createSessionId(),
    startedAt: new Date().toISOString(),
    firstQuery: null,
    queryChain: [],
    topicChain: [],
    collectionSlugs: [],
    topicInteractionCounts: {},
    compareActions: 0,
    citationExports: 0,
    saveActions: 0,
    revisitActions: 0,
    exportActions: 0,
    startedEventSent: false,
  };
}

export function getResearchSessionId(): string {
  return ensureResearchSession().sessionId;
}

export function ensureResearchSession(): StoredResearchSession {
  const existing = readStore();
  if (existing) return existing;
  const session = emptySession();
  writeStore(session);
  return session;
}

function persist(session: StoredResearchSession): StoredResearchSession {
  writeStore(session);
  return session;
}

function basePayload(session: StoredResearchSession, extra: Record<string, string | number | boolean | null | undefined> = {}) {
  return {
    researchSessionId: session.sessionId,
    queryChainLength: session.queryChain.length,
    topicChainLength: session.topicChain.length,
    researchDepthScore: session.queryChain.length + session.topicChain.length, // lightweight hint; server recomputes
    ...extra,
  };
}

function maybeStartSession(session: StoredResearchSession, query?: string): StoredResearchSession {
  let s = session;
  if (query?.trim() && !s.firstQuery) {
    s = { ...s, firstQuery: query.trim() };
  }
  if (!s.startedEventSent) {
    void trackPersistentEvent("research_session_started", basePayload(s, {
      query: s.firstQuery ?? query,
      surface: "research_session",
    }));
    s = { ...s, startedEventSent: true };
  }
  return persist(s);
}

function extendSession(
  session: StoredResearchSession,
  action: string,
  extra: Record<string, string | number | boolean | null | undefined> = {}
): void {
  void trackPersistentEvent("research_session_extended", basePayload(session, { action, ...extra }));
}

function pushQuery(session: StoredResearchSession, query: string): StoredResearchSession {
  const q = query.trim();
  if (!q) return session;
  if (session.queryChain.includes(q)) return session;
  const next = { ...session, queryChain: [...session.queryChain, q] };
  void trackPersistentEvent("research_chain_depth", basePayload(next, {
    chain: "query",
    depth: next.queryChain.length,
    query: q,
  }));
  extendSession(next, "query_chain", { query: q, depth: next.queryChain.length });
  return persist(next);
}

function pushTopic(session: StoredResearchSession, topicSlug: string): StoredResearchSession {
  const t = topicSlug.trim().toLowerCase();
  if (!t) return session;
  const counts = { ...session.topicInteractionCounts };
  counts[t] = (counts[t] ?? 0) + 1;
  const isRepeat = counts[t] >= 2;
  let next = { ...session, topicInteractionCounts: counts };
  if (!session.topicChain.includes(t)) {
    next = { ...next, topicChain: [...next.topicChain, t] };
    void trackPersistentEvent("research_chain_depth", basePayload(next, {
      chain: "topic",
      depth: next.topicChain.length,
      topicSlug: t,
    }));
  }
  if (isRepeat) {
    void trackPersistentEvent("repeat_topic_research", basePayload(next, {
      topicSlug: t,
      interactionCount: counts[t],
    }));
  }
  extendSession(next, "topic_chain", { topicSlug: t, depth: next.topicChain.length });
  return persist(next);
}

export function instrumentResearchQuery(query: string): void {
  pushQuery(maybeStartSession(ensureResearchSession(), query), query);
}

export function instrumentResearchTopic(topicSlug: string, surface: string): void {
  let s = maybeStartSession(ensureResearchSession());
  s = pushTopic(s, topicSlug);
  extendSession(s, "topic_surface", { topicSlug, surface });
}

export function instrumentResearchCompare(payload: {
  query?: string;
  topicSlug?: string;
  surface: string;
  rowCount?: number;
}): void {
  let s = maybeStartSession(ensureResearchSession(), payload.query);
  if (payload.query) s = pushQuery(s, payload.query);
  if (payload.topicSlug) s = pushTopic(s, payload.topicSlug);
  s = persist({ ...s, compareActions: s.compareActions + 1 });
  void trackPersistentEvent("research_compare_used", basePayload(s, {
    query: payload.query,
    topic: payload.topicSlug,
    surface: payload.surface,
    rowCount: payload.rowCount,
  }));
}

export function instrumentCitationWorkflow(payload: {
  momentId: string;
  videoId: string;
  format: string;
}): void {
  let s = maybeStartSession(ensureResearchSession());
  s = persist({ ...s, citationExports: s.citationExports + 1 });
  void trackPersistentEvent("citation_workflow_completed", basePayload(s, payload));
}

export function instrumentResearchSave(payload: { query?: string; videoId: string }): void {
  let s = maybeStartSession(ensureResearchSession(), payload.query);
  if (payload.query) s = pushQuery(s, payload.query);
  s = persist({ ...s, saveActions: s.saveActions + 1 });
  extendSession(s, "save", payload);
}

export function instrumentSavedResearchReturn(clipCount: number): void {
  let s = maybeStartSession(ensureResearchSession());
  s = persist({ ...s, revisitActions: s.revisitActions + 1 });
  void trackPersistentEvent("saved_research_return", basePayload(s, {
    clipCount,
    returnVisit: true,
  }));
}

export function instrumentCollectionVisit(slug: string, momentCount: number): void {
  let s = maybeStartSession(ensureResearchSession());
  const isRevisit = s.collectionSlugs.includes(slug);
  s = persist({
    ...s,
    collectionSlugs: isRevisit ? s.collectionSlugs : [...s.collectionSlugs, slug],
  });
  if (isRevisit) {
    void trackPersistentEvent("collection_revisit", basePayload(s, { topic: slug, momentCount }));
  } else {
    extendSession(s, "collection_first_visit", { topic: slug, momentCount });
  }
}

export function instrumentRelatedMomentNavigation(payload: {
  fromMomentId: string;
  toMomentId: string;
  videoId: string;
  surface: string;
}): void {
  const s = maybeStartSession(ensureResearchSession());
  extendSession(s, "related_moment", payload);
}

export function instrumentResearchExport(payload: {
  format: string;
  clipCount?: number;
  surface: string;
}): void {
  let s = maybeStartSession(ensureResearchSession());
  s = persist({ ...s, exportActions: s.exportActions + 1 });
  void trackPersistentEvent("research_export_completed", basePayload(s, payload));
}

/** Attach research session id to any persistent analytics event. */
export function withResearchSession(
  payload: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null | undefined> {
  const s = ensureResearchSession();
  return basePayload(s, payload);
}

export function trackResearchPersistentEvent(
  name: AnalyticsEventName,
  payload: Record<string, string | number | boolean | null | undefined> = {}
): void {
  void trackPersistentEvent(name, withResearchSession(payload));
}
