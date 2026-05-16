"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentResearchQuery, instrumentResearchTopic, withResearchSession } from "@/lib/research/research-session-client";
import type { ResearchAnswerSlotKey } from "@/lib/research/research-answer-types";

export function ResearchExplanationSlotLink(props: {
  href: string;
  className?: string;
  children: ReactNode;
  query: string;
  topicSlug?: string;
  slotKey: ResearchAnswerSlotKey;
  momentId: string;
  videoId: string;
  qualityTier: string;
  sourceAuthorityLabel: string;
  surface: string;
}) {
  return (
    <Link
      href={props.href}
      className={props.className}
      onClick={() => {
        instrumentResearchQuery(props.query);
        if (props.topicSlug) instrumentResearchTopic(props.topicSlug, props.surface);
        void trackPersistentEvent(
          "research_explanation_click",
          withResearchSession({
            query: props.query,
            topic: props.topicSlug,
            slotKey: props.slotKey,
            momentId: props.momentId,
            videoId: props.videoId,
            qualityTier: props.qualityTier,
            sourceAuthorityLabel: props.sourceAuthorityLabel,
            surface: props.surface,
          })
        );
      }}
    >
      {props.children}
    </Link>
  );
}
