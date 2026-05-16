"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentResearchQuery, instrumentResearchTopic, withResearchSession } from "@/lib/research/research-session-client";

export function ResearchAnswerViewBeacon(props: {
  query: string;
  topicSlug?: string;
  surface: string;
}) {
  useEffect(() => {
    instrumentResearchQuery(props.query);
    if (props.topicSlug) instrumentResearchTopic(props.topicSlug, props.surface);
    void trackPersistentEvent(
      "research_answer_view",
      withResearchSession({
        query: props.query,
        topic: props.topicSlug,
        surface: props.surface,
      })
    );
  }, [props.query, props.topicSlug, props.surface]);
  return null;
}
