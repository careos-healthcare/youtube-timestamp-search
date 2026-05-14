"use client";

import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { classifyReferrer } from "@/lib/referrer-tracking";

export function ReferrerTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const referrer = document.referrer || "";
    const source = classifyReferrer(referrer);

    trackPersistentEvent("referrer_visit", {
      source,
      referrer: referrer.slice(0, 500),
      path: window.location.pathname,
    });
  }, []);

  return null;
}
