import Link from "next/link";

import type { BestMoment } from "@/lib/best-moments";

type BestMomentsSectionProps = {
  moments: BestMoment[];
};

const REASON_LABELS: Record<BestMoment["reason"], string> = {
  "repeated-phrase": "Repeated phrase",
  "keyword-density": "Keyword density",
  "semantic-anchor": "Core topic",
};

export function BestMomentsSection({ moments }: BestMomentsSectionProps) {
  if (moments.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">Most useful moments from this video</h2>
        <p className="text-sm text-slate-300">
          Ranked from repeated spoken phrases, dense keyword segments, and core topics in the
          transcript.
        </p>
        <div className="grid gap-3">
          {moments.map((moment) => (
            <article
              key={`${moment.start}-${moment.keyword}`}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-semibold text-violet-100">
                  {moment.timestamp}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-300">
                  {REASON_LABELS[moment.reason]}
                </span>
                <span className="text-slate-500">{moment.keyword}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{moment.snippet}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={moment.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 text-sm text-blue-100"
                >
                  Open on YouTube
                </a>
                <Link
                  href={moment.momentPath}
                  className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200"
                >
                  View moment page
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
