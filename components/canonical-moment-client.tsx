"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import { buildPublicMomentPath } from "@/lib/seo";

export function CanonicalMomentPageViewTracker(props: {
  momentId: string;
  videoId: string;
  phraseLength: number;
}) {
  useEffect(() => {
    trackEvent("canonical_moment_page_view", {
      videoId: props.videoId,
      phraseLength: props.phraseLength,
      momentId: props.momentId,
    });
  }, [props.momentId, props.phraseLength, props.videoId]);
  return null;
}

export function CanonicalMomentYoutubeCta(props: {
  href: string;
  children: ReactNode;
  videoId: string;
  momentId: string;
  phrase: string;
  className?: string;
}) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      className={props.className}
      onClick={() => {
        trackEvent("canonical_moment_youtube_click", {
          videoId: props.videoId,
          momentId: props.momentId,
        });
        trackPersistentEvent("youtube_open", {
          videoId: props.videoId,
          query: props.phrase,
        });
      }}
    >
      {props.children}
    </a>
  );
}

export type CanonicalMomentRelatedItem = {
  id: string;
  canonicalSlug: string;
  phrase: string;
  videoTitle?: string;
  videoId: string;
  timestamp: string;
};

export function CanonicalMomentRelatedList(props: {
  currentId: string;
  items: CanonicalMomentRelatedItem[];
}) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {props.items.map((m) => (
        <li key={m.id}>
          <Link
            href={buildPublicMomentPath(m.id, m.canonicalSlug)}
            onClick={() =>
              trackEvent("canonical_moment_related_click", {
                fromMomentId: props.currentId,
                toMomentId: m.id,
                videoId: m.videoId,
              })
            }
            className="block rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10"
          >
            <span className="font-medium text-white">&quot;{m.phrase}&quot;</span>
            <span className="mt-1 block text-xs text-slate-400">
              {m.videoTitle ?? m.videoId} · {m.timestamp}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
