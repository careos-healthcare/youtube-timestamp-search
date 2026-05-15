"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

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
    const base: Record<string, string | number | boolean | null | undefined> = { topicSlug };
    if (momentId) base.momentId = momentId;
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
