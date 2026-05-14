"use client";

import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { classifyReferrer, type ReferrerSource } from "@/lib/referrer-tracking";

function utmToReferrerSource(utmSource: string | null): ReferrerSource | null {
  if (!utmSource) return null;
  const value = utmSource.toLowerCase();
  if (value === "reddit") return "reddit";
  if (value === "hackernews" || value === "hn") return "hackernews";
  if (value === "twitter" || value === "x") return "twitter";
  if (value === "google") return "google";
  return "other";
}

export function ReferrerTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const referrer = document.referrer || "";
    const classified = classifyReferrer(referrer);
    const source = utmToReferrerSource(utmSource) ?? classified;

    trackPersistentEvent("referrer_visit", {
      source,
      referrer: referrer.slice(0, 500),
      path: window.location.pathname,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
    });
  }, []);

  return null;
}
