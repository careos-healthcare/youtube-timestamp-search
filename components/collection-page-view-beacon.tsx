"use client";

import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

export function CollectionPageViewBeacon(props: { slug: string; momentCount: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackPersistentEvent("collection_page_view", {
      topic: props.slug,
      momentCount: props.momentCount,
      surface: "collection",
    });
  }, [props.momentCount, props.slug]);
  return null;
}
