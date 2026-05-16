"use client";

import { useEffect } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

export function ResearchAnswerViewBeacon(props: {
  query: string;
  topicSlug?: string;
  surface: string;
}) {
  useEffect(() => {
    void trackPersistentEvent("research_answer_view", {
      query: props.query,
      topic: props.topicSlug,
      surface: props.surface,
    });
  }, [props.query, props.topicSlug, props.surface]);
  return null;
}
