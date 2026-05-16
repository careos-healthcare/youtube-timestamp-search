"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import type { MomentQualityEvaluation } from "@/lib/quality/types";

export type MomentQualitySurface =
  | "canonical_moment"
  | "moments_index"
  | "topic_hub"
  | "search_result"
  | "related_moment";

function tierStyles(tier: MomentQualityEvaluation["qualityTier"]) {
  if (tier === "high") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-50";
  if (tier === "medium") return "border-amber-400/35 bg-amber-500/12 text-amber-50";
  return "border-slate-500/40 bg-slate-800/80 text-slate-200";
}

function analyticsPayload(
  momentId: string,
  phrase: string,
  videoId: string,
  evaluation: MomentQualityEvaluation,
  surface: MomentQualitySurface
) {
  return {
    momentId,
    phrase,
    videoId,
    qualityTier: evaluation.qualityTier,
    signals: evaluation.signals.join("|"),
    surface,
  };
}

export function MomentQualitySignals(props: {
  evaluation: MomentQualityEvaluation;
  momentId: string;
  videoId: string;
  phrase: string;
  surface: MomentQualitySurface;
  compact?: boolean;
}) {
  const { evaluation, momentId, videoId, phrase, surface, compact } = props;
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const panelId = `${baseId}-why`;

  const viewSentKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${momentId}:${surface}`;
    if (viewSentKey.current === key) return;
    viewSentKey.current = key;
    void trackPersistentEvent("quality_signal_view", analyticsPayload(momentId, phrase, videoId, evaluation, surface));
  }, [evaluation, momentId, phrase, videoId, surface]);

  const onBadgeClick = useCallback(() => {
    void trackPersistentEvent("quality_badge_click", analyticsPayload(momentId, phrase, videoId, evaluation, surface));
    setOpen((v) => {
      if (!v) {
        void trackPersistentEvent(
          "quality_explanation_open",
          analyticsPayload(momentId, phrase, videoId, evaluation, surface)
        );
      }
      return !v;
    });
  }, [evaluation, momentId, phrase, videoId, surface]);

  const onWhyClick = useCallback(() => {
    setOpen((v) => {
      if (!v) {
        void trackPersistentEvent(
          "quality_explanation_open",
          analyticsPayload(momentId, phrase, videoId, evaluation, surface)
        );
      }
      return !v;
    });
  }, [evaluation, momentId, phrase, videoId, surface]);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBadgeClick}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tierStyles(evaluation.qualityTier)}`}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span>Clip signals</span>
          <span className="opacity-80">·</span>
          <span className="normal-case">{evaluation.signals.join(" · ")}</span>
        </button>
        {!compact ? (
          <span className="text-[11px] text-slate-500">Heuristic · not fact-checking</span>
        ) : null}
      </div>

      {evaluation.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-200/90">
          {evaluation.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onWhyClick}
          className="text-left text-xs font-medium text-blue-200 hover:text-blue-100"
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? "Hide “Why this moment?”" : "Why this moment?"}
        </button>
        {open ? (
          <div id={panelId} className="mt-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
            <p className="font-medium text-slate-200">How we ranked this clip (heuristic)</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              {evaluation.whyThisRanks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Score {evaluation.qualityScore}/100 · tier {evaluation.qualityTier}. This describes the kind of spoken
              content the excerpt looks like — not whether it is correct.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
