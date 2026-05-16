"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import type { SourceAuthorityLabel, SourceAuthorityResult } from "@/lib/research/source-authority";
import { SOURCE_AUTHORITY_UI_LABEL } from "@/lib/research/source-authority";

export type SourceAuthoritySurface =
  | "canonical_moment"
  | "moments_index"
  | "topic_hub"
  | "search_result"
  | "collection"
  | "compare_section"
  | "saved_library";

function confidenceStyles(c: SourceAuthorityResult["sourceAuthorityConfidence"]) {
  if (c === "high") return "border-emerald-400/35 bg-emerald-500/12 text-emerald-50";
  if (c === "medium") return "border-amber-400/35 bg-amber-500/10 text-amber-50";
  return "border-slate-500/40 bg-slate-800/70 text-slate-200";
}

export function SourceAuthorityBadge(props: {
  authority: SourceAuthorityResult;
  momentId: string;
  videoId: string;
  phrase: string;
  query?: string;
  surface: SourceAuthoritySurface;
  compact?: boolean;
}) {
  const { authority, momentId, videoId, phrase, query, surface, compact } = props;
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const panelId = `${baseId}-src`;
  const viewSent = useRef<string | null>(null);

  useEffect(() => {
    const key = `${momentId}:${surface}`;
    if (viewSent.current === key) return;
    viewSent.current = key;
    void trackPersistentEvent("source_authority_badge_view", {
      momentId,
      videoId,
      phrase,
      query,
      surface,
      sourceAuthorityLabel: authority.sourceAuthorityLabel,
    });
  }, [authority.sourceAuthorityLabel, momentId, phrase, query, surface, videoId]);

  const onToggle = useCallback(() => {
    setOpen((v) => {
      if (!v) {
        void trackPersistentEvent("source_authority_explanation_open", {
          momentId,
          videoId,
          phrase,
          query,
          surface,
          sourceAuthorityLabel: authority.sourceAuthorityLabel,
        });
      }
      return !v;
    });
  }, [authority.sourceAuthorityLabel, momentId, phrase, query, surface, videoId]);

  const labelText = SOURCE_AUTHORITY_UI_LABEL[authority.sourceAuthorityLabel as SourceAuthorityLabel];

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide ${confidenceStyles(authority.sourceAuthorityConfidence)}`}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="shrink-0">Source context</span>
          <span className="opacity-70">·</span>
          <span className="normal-case font-medium">{labelText}</span>
        </button>
        {!compact ? (
          <span className="text-[10px] text-slate-500">Heuristic label · not a fact-check</span>
        ) : null}
      </div>
      {open ? (
        <div
          id={panelId}
          className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-200"
        >
          <p>{authority.sourceAuthorityReason}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            Confidence: {authority.sourceAuthorityConfidence}. Always listen to the clip and check the original channel
            before relying on a pull quote.
          </p>
        </div>
      ) : null}
    </div>
  );
}
