"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

type EmptySearchRecoveryTrackerProps = {
  phrase: string;
};

/** Fires once per phrase view when empty-state alternatives are rendered. */
export function EmptySearchRecoveryTracker({ phrase }: EmptySearchRecoveryTrackerProps) {
  useEffect(() => {
    trackPersistentEvent("empty_search_recovered", { query: phrase });
  }, [phrase]);

  return null;
}
