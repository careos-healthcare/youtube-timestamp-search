"use client";

import { useEffect } from "react";

import { ensureResearchSession } from "@/lib/research/research-session-client";

/** Initializes research session id for the browser tab (no UI). */
export function ResearchSessionBridge() {
  useEffect(() => {
    ensureResearchSession();
  }, []);
  return null;
}
