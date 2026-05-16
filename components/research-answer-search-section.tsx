import Link from "next/link";

import { buildResearchAnswerFromSearchMoments } from "@/lib/research";
import type { ResearchAnswerSlotKey } from "@/lib/research/research-answer-types";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { evaluateMomentQualitySignals } from "@/lib/quality";
import { buildSearchPath } from "@/lib/seo";

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

export function ResearchAnswerSearchSection(props: { queryLabel: string; moments: SearchLandingMoment[] }) {
  if (props.moments.length < 3) return null;

  const answer = buildResearchAnswerFromSearchMoments(props.queryLabel, props.moments);
  const filled = SLOT_ORDER.map((k) => answer.slots[k]).filter(Boolean);
  if (filled.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4 sm:p-6">
      <ResearchAnswerViewBeacon query={props.queryLabel} surface="search_research_answer" />
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100/90">Research lens</p>
        <h2 className="text-lg font-semibold text-white">Best answer across videos (this query)</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Slots group live transcript hits by heuristic roles. Canonical public moment pages may exist separately when a
          clip is materialized into the index.
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {SLOT_ORDER.map((key) => {
          const slot = answer.slots[key];
          if (!slot) return null;
          const q = evaluateMomentQualitySignals({
            phrase: props.queryLabel,
            snippet: slot.moment.snippet,
            videoTitle: slot.moment.videoTitle,
            channelName: slot.moment.channelName,
            materializationScore: slot.moment.score,
            startSeconds: slot.moment.startSeconds,
          });
          return (
            <article key={key} className="flex flex-col rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{SLOT_TITLE[key]}</p>
              <ResearchExplanationSlotLink
                href={slot.moment.momentPath}
                className="mt-2 block"
                query={props.queryLabel}
                slotKey={key}
                momentId={slot.syntheticMomentId}
                videoId={slot.moment.videoId}
                qualityTier={q.qualityTier}
                sourceAuthorityLabel={slot.authority.sourceAuthorityLabel}
                surface="search_research_answer"
              >
                <p className="text-sm leading-relaxed text-slate-100 line-clamp-4">{slot.moment.snippet}</p>
                <p className="mt-2 text-xs text-slate-400 line-clamp-1">{slot.moment.videoTitle}</p>
              </ResearchExplanationSlotLink>
              <p className="mt-2 text-xs text-slate-500">{slot.rationale}</p>
              <div className="mt-3 border-t border-white/5 pt-3">
                <SourceAuthorityBadge
                  authority={slot.authority}
                  momentId={slot.syntheticMomentId}
                  videoId={slot.moment.videoId}
                  phrase={props.queryLabel}
                  query={props.queryLabel}
                  surface="search_result"
                  compact
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link className="text-blue-200 hover:text-blue-100" href={slot.moment.videoPath}>
                  Video page
                </Link>
                <Link className="text-blue-200 hover:text-blue-100" href={buildSearchPath(props.queryLabel)}>
                  Search
                </Link>
                <Link className="text-blue-200 hover:text-blue-100" href={slot.moment.youtubeUrl}>
                  YouTube
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
