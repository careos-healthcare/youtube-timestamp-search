"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

export function TrendingPageViewTracker() {
  useEffect(() => {
    trackEvent("trending_page_open", {});
  }, []);
  return null;
}
