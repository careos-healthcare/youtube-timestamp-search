"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

export function TopicPageViewTracker(props: {
  topicSlug: string;
  mode: "seed" | "intelligence";
  momentCount: number;
  quality?: string;
}) {
  useEffect(() => {
    void trackPersistentEvent("topic_page_view", {
      topicSlug: props.topicSlug,
      mode: props.mode,
      momentCount: props.momentCount,
      quality: props.quality,
    });
  }, [props.topicSlug, props.mode, props.momentCount, props.quality]);

  return null;
}
