"use client";

import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentCollectionVisit, withResearchSession } from "@/lib/research/research-session-client";

export function CollectionPageViewBeacon(props: { slug: string; momentCount: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    instrumentCollectionVisit(props.slug, props.momentCount);
    void trackPersistentEvent(
      "collection_page_view",
      withResearchSession({
        topic: props.slug,
        momentCount: props.momentCount,
        surface: "collection",
      })
    );
  }, [props.momentCount, props.slug]);
  return null;
}
