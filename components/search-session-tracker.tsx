"use client";

import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

type SearchSessionTrackerProps = {
  query: string;
  resultCount: number;
  answerMode?: "answer" | "moments-only";
};

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SearchSessionTracker({ query, resultCount, answerMode }: SearchSessionTrackerProps) {
  const sessionIdRef = useRef<string>(createSessionId());
  const previousQueryRef = useRef<string | null>(null);
  const clickedRef = useRef(false);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const previousQuery = previousQueryRef.current;

    if (previousQuery && previousQuery !== query) {
      trackPersistentEvent("search_reformulation", {
        query,
        previousQuery,
        sessionId,
        resultCount,
      });
    }

    if (resultCount === 0 && previousQuery) {
      trackPersistentEvent("search_pogo_stick", { query, sessionId, resultCount });
    }

    previousQueryRef.current = query;
  }, [query, resultCount]);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const timeout = window.setTimeout(() => {
      if (!clickedRef.current && resultCount > 0) {
        trackPersistentEvent("search_abandon", { query, sessionId, resultCount });
      }
    }, 45000);

    return () => window.clearTimeout(timeout);
  }, [query, resultCount]);

  useEffect(() => {
    if (answerMode === "answer" && resultCount > 0) {
      trackPersistentEvent("search_answer_success", {
        query,
        sessionId: sessionIdRef.current,
        resultCount,
        answerMode,
      });
    }
  }, [answerMode, query, resultCount]);

  useEffect(() => {
    const onClick = () => {
      clickedRef.current = true;
      trackPersistentEvent("search_dwell", {
        query,
        sessionId: sessionIdRef.current,
        resultCount,
      });
    };

    window.addEventListener("click", onClick, { passive: true });
    return () => window.removeEventListener("click", onClick);
  }, [query, resultCount]);

  return null;
}
