"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentResearchTopic, withResearchSession } from "@/lib/research/research-session-client";

export function TopicPageViewTracker(props: {
  topicSlug: string;
  mode: "seed" | "intelligence";
  momentCount: number;
  quality?: string;
}) {
  useEffect(() => {
    instrumentResearchTopic(props.topicSlug, "topic_page");
    void trackPersistentEvent(
      "topic_page_view",
      withResearchSession({
        topicSlug: props.topicSlug,
        mode: props.mode,
        momentCount: props.momentCount,
        quality: props.quality,
      })
    );
  }, [props.topicSlug, props.mode, props.momentCount, props.quality]);

  return null;
}
