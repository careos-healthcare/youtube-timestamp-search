"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import type { CompareExplanationPublicRow, CompareExplanationSearchRow } from "@/lib/research/compare-explanations";
import { evaluateMomentQualitySignals, evaluatePublicMoment } from "@/lib/quality";
import { buildPublicMomentPath, buildSearchPath, buildTopicPath, buildVideoPath } from "@/lib/seo";

import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { SourceAuthorityBadge } from "@/components/source-authority-badge";

type CompareProps =
  | {
      variant: "public";
      topicSlug: string;
      queryLabel: string;
      rows: CompareExplanationPublicRow[];
    }
  | {
      variant: "search";
      queryLabel: string;
      rows: CompareExplanationSearchRow[];
    };

export function CompareExplanationsSection(props: CompareProps) {
  const sent = useRef(false);
  const queryLabel = props.queryLabel;
  const topicSlug = props.variant === "public" ? props.topicSlug : undefined;
  const variant = props.variant;
  const rowCount = props.rows.length;

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackPersistentEvent("compare_explanations_view", {
      query: queryLabel,
      topic: topicSlug,
      surface: variant === "public" ? "topic_compare" : "search_compare",
      rowCount,
    });
  }, [queryLabel, topicSlug, rowCount, variant]);

  if (props.rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Compare explanations</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">
        Different creators and framings for the same topic — beginner vs technical, tutorial vs opinion-heavy, and
        possible caveats when detected. Links stay transcript-backed; no generated text.
      </p>

      <ul className="mt-5 grid gap-4 lg:grid-cols-2">
        {props.variant === "public"
          ? props.rows.map((row) => {
              const q = evaluatePublicMoment(row.moment);
              const href = buildPublicMomentPath(row.moment.id, row.moment.canonicalSlug);
              return (
                <li key={row.moment.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <Link
                    href={href}
                    className="block"
                    onClick={() =>
                      void trackPersistentEvent("compare_explanation_click", {
                        query: props.queryLabel,
                        topic: props.topicSlug,
                        momentId: row.moment.id,
                        videoId: row.moment.videoId,
                        sourceAuthorityLabel: row.authority.sourceAuthorityLabel,
                        qualityTier: row.qualityTier,
                        surface: "topic_compare",
                      })
                    }
                  >
                    <p className="text-sm font-semibold text-white line-clamp-2">&quot;{row.moment.phrase}&quot;</p>
                    <p className="mt-1 text-xs text-slate-400">{row.moment.videoTitle}</p>
                  </Link>
                  <p className="mt-2 text-xs font-medium text-violet-100">{row.differentiation}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-4">{row.moment.snippet}</p>
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    <MomentQualitySignals
                      evaluation={q}
                      momentId={row.moment.id}
                      videoId={row.moment.videoId}
                      phrase={row.moment.phrase}
                      surface="topic_hub"
                      compact
                    />
                    <SourceAuthorityBadge
                      authority={row.authority}
                      momentId={row.moment.id}
                      videoId={row.moment.videoId}
                      phrase={row.moment.phrase}
                      query={props.queryLabel}
                      surface="compare_section"
                      compact
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link className="text-blue-200 hover:text-blue-100" href={href}>
                      Moment
                    </Link>
                    <Link className="text-blue-200 hover:text-blue-100" href={buildVideoPath(row.moment.videoId)}>
                      Video
                    </Link>
                    <Link className="text-blue-200 hover:text-blue-100" href={buildTopicPath(props.topicSlug)}>
                      Topic
                    </Link>
                    <Link className="text-blue-200 hover:text-blue-100" href={`${href}#cite-this-moment`}>
                      Citation
                    </Link>
                  </div>
                </li>
              );
            })
          : props.rows.map((row) => {
              const q = evaluateMomentQualitySignals({
                phrase: props.queryLabel,
                snippet: row.moment.snippet,
                videoTitle: row.moment.videoTitle,
                channelName: row.moment.channelName,
                materializationScore: row.moment.score,
                startSeconds: row.moment.startSeconds,
              });
              return (
                <li key={row.syntheticMomentId} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <Link
                    href={row.moment.momentPath}
                    className="block"
                    onClick={() =>
                      void trackPersistentEvent("compare_explanation_click", {
                        query: props.queryLabel,
                        momentId: row.syntheticMomentId,
                        videoId: row.moment.videoId,
                        sourceAuthorityLabel: row.authority.sourceAuthorityLabel,
                        qualityTier: row.qualityTier,
                        surface: "search_compare",
                      })
                    }
                  >
                    <p className="text-sm leading-relaxed text-slate-100 line-clamp-4">{row.moment.snippet}</p>
                    <p className="mt-2 text-xs text-slate-400">{row.moment.videoTitle}</p>
                  </Link>
                  <p className="mt-2 text-xs font-medium text-violet-100">{row.differentiation}</p>
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    <MomentQualitySignals
                      evaluation={q}
                      momentId={row.syntheticMomentId}
                      videoId={row.moment.videoId}
                      phrase={props.queryLabel}
                      surface="search_result"
                      compact
                    />
                    <SourceAuthorityBadge
                      authority={row.authority}
                      momentId={row.syntheticMomentId}
                      videoId={row.moment.videoId}
                      phrase={props.queryLabel}
                      query={props.queryLabel}
                      surface="compare_section"
                      compact
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link className="text-blue-200 hover:text-blue-100" href={row.moment.momentPath}>
                      Moment
                    </Link>
                    <Link className="text-blue-200 hover:text-blue-100" href={row.moment.videoPath}>
                      Video
                    </Link>
                    <Link className="text-blue-200 hover:text-blue-100" href={buildSearchPath(props.queryLabel)}>
                      Search
                    </Link>
                  </div>
                </li>
              );
            })}
      </ul>
    </section>
  );
}
