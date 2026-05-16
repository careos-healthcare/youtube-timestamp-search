"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentResearchTopic, withResearchSession } from "@/lib/research/research-session-client";

type TopicLinkKind = "moment" | "related" | "creator" | "search";

export function TopicAnalyticsLink(props: {
  kind: TopicLinkKind;
  topicSlug: string;
  href: string;
  className?: string;
  momentId?: string;
  children: ReactNode;
}) {
  const { kind, topicSlug, href, className, children, momentId } = props;

  function fire() {
    instrumentResearchTopic(topicSlug, `topic_${kind}`);
    const base = withResearchSession({ topicSlug, ...(momentId ? { momentId } : {}) });
    if (kind === "moment") {
      void trackPersistentEvent("topic_moment_click", base);
    } else if (kind === "related") {
      void trackPersistentEvent("topic_related_click", base);
    } else if (kind === "creator") {
      void trackPersistentEvent("topic_creator_click", base);
    } else {
      void trackPersistentEvent("topic_search_click", base);
    }
  }

  return (
    <Link href={href} className={className} onClick={() => fire()}>
      {children}
    </Link>
  );
}
