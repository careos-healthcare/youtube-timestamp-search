export {
  loadSessionAnalyticsEvents,
  groupEventsIntoSessions,
  analyzeSession,
  buildSessionIntelligenceSignals,
  type SessionAnalyticsEvent,
  type SearchSession,
  type SessionIntelligenceSignals,
} from "@/lib/search-session/session-intelligence";

export {
  computeSearchSatisfactionScore,
  type SearchSatisfactionScore,
  type SearchSatisfactionBreakdown,
} from "@/lib/search-session/satisfaction-score";
