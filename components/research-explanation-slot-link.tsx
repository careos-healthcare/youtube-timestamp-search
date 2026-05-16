"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
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
      onClick={() =>
        void trackPersistentEvent("research_explanation_click", {
          query: props.query,
          topic: props.topicSlug,
          slotKey: props.slotKey,
          momentId: props.momentId,
          videoId: props.videoId,
          qualityTier: props.qualityTier,
          sourceAuthorityLabel: props.sourceAuthorityLabel,
          surface: props.surface,
        })
      }
    >
      {props.children}
    </Link>
  );
}
