import Link from "next/link";

import type { ResearchAnswerSlotKey } from "@/lib/research/research-answer-types";
import { buildResearchAnswerFromPublicMoments } from "@/lib/research";
import { evaluatePublicMoment } from "@/lib/quality";
import { buildPublicMomentPath, buildSearchPath, buildTopicPath, buildVideoPath } from "@/lib/seo";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

import { ResearchAnswerViewBeacon } from "@/components/research-answer-view-beacon";
import { ResearchExplanationSlotLink } from "@/components/research-explanation-slot-link";
import { SourceAuthorityBadge } from "@/components/source-authority-badge";

const SLOT_TITLE: Record<ResearchAnswerSlotKey, string> = {
  bestExplanation: "Best explanation",
  beginnerExplanation: "Beginner explanation",
  technicalExplanation: "Technical explanation",
  counterpoint: "Counterpoint / caveat",
  primarySource: "Primary-source style moment",
  mostEngaged: "Most saved locally (hint)",
};

const SLOT_ORDER: ResearchAnswerSlotKey[] = [
  "bestExplanation",
  "beginnerExplanation",
  "technicalExplanation",
  "counterpoint",
  "primarySource",
  "mostEngaged",
];

export function ResearchAnswerPublicSection(props: {
  queryLabel: string;
  topicSlug: string;
  moments: PublicMomentRecord[];
}) {
  if (props.moments.length < 3) return null;

  const answer = buildResearchAnswerFromPublicMoments(props.queryLabel, props.topicSlug, props.moments);
  const filled = SLOT_ORDER.map((k) => answer.slots[k]).filter(Boolean);
  if (filled.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4 sm:p-6">
      <ResearchAnswerViewBeacon query={props.queryLabel} topicSlug={props.topicSlug} surface="topic_research_answer" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">Research lens</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Best answer across indexed moments</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Grouped by transcript heuristics only — not generative summaries and not fact-checking. Empty slots mean we
            did not find a confident match for that role in this hub.
          </p>
        </div>
        <Link
          href={buildSearchPath(props.queryLabel)}
          className="text-sm text-cyan-100 underline-offset-2 hover:text-white"
        >
          Open cross-video search →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {SLOT_ORDER.map((key) => {
          const slot = answer.slots[key];
          if (!slot) return null;
          const q = evaluatePublicMoment(slot.moment);
          return (
            <article
              key={key}
              className="flex flex-col rounded-xl border border-white/10 bg-slate-950/50 p-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{SLOT_TITLE[key]}</p>
              <ResearchExplanationSlotLink
                href={buildPublicMomentPath(slot.moment.id, slot.moment.canonicalSlug)}
                className="mt-2 block"
                query={props.queryLabel}
                topicSlug={props.topicSlug}
                slotKey={key}
                momentId={slot.moment.id}
                videoId={slot.moment.videoId}
                qualityTier={q.qualityTier}
                sourceAuthorityLabel={slot.authority.sourceAuthorityLabel}
                surface="topic_research_answer"
              >
                <p className="text-sm font-semibold text-white line-clamp-3">&quot;{slot.moment.phrase}&quot;</p>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{slot.moment.videoTitle}</p>
              </ResearchExplanationSlotLink>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{slot.rationale}</p>
              <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                <SourceAuthorityBadge
                  authority={slot.authority}
                  momentId={slot.moment.id}
                  videoId={slot.moment.videoId}
                  phrase={slot.moment.phrase}
                  query={props.queryLabel}
                  surface="topic_hub"
                  compact
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link className="text-blue-200 hover:text-blue-100" href={buildVideoPath(slot.moment.videoId)}>
                  Video transcript
                </Link>
                <Link className="text-blue-200 hover:text-blue-100" href={buildTopicPath(props.topicSlug)}>
                  Topic hub
                </Link>
                <Link
                  className="text-blue-200 hover:text-blue-100"
                  href={`${buildPublicMomentPath(slot.moment.id, slot.moment.canonicalSlug)}#cite-this-moment`}
                >
                  Citation block
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
