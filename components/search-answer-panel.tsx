"use client";

import Link from "next/link";

import { SaveMomentButton } from "@/components/save-moment-button";
import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { ViralShareBlock } from "@/components/viral-share-block";
import { trackPersistentEvent } from "@/lib/analytics";
import { recordTimestampClickMilestone } from "@/lib/growth/session-metrics";
import type { ViralShareContext } from "@/lib/growth/viral-share-text";
import type { SearchLandingData } from "@/lib/search-landing-engine";
import { evaluateMomentQualitySignals } from "@/lib/quality";
import { getSiteUrl } from "@/lib/seo";

type SearchAnswerPanelProps = {
  data: SearchLandingData;
};

function confidenceCopy(label: SearchLandingData["answer"]["confidenceLabel"]) {
  if (label === "high") return "High confidence — pulled verbatim from transcript";
  if (label === "medium") return "Moderate confidence — transcript excerpt only";
  return "Low confidence";
}

export function SearchAnswerPanel({ data }: SearchAnswerPanelProps) {
  const { answer } = data;

  if (answer.mode === "moments-only") {
    return (
      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Best matching moments</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          We could not extract a single clear spoken answer for &quot;{data.phrase}&quot; with enough
          confidence. Browse the timestamped moments below — each snippet is taken directly from the
          transcript.
        </p>
      </section>
    );
  }

  if (!answer.answerSnippet || !answer.sourceMoment || !answer.timestampRange || !answer.jumpUrl) {
    return null;
  }

  const source = answer.sourceMoment;
  const range = answer.timestampRange;
  const answerQuality = evaluateMomentQualitySignals({
    phrase: data.phrase,
    snippet: answer.answerSnippet,
    videoTitle: source.videoTitle,
    channelName: source.channelName,
    startSeconds: source.startSeconds,
  });
  const answerMomentId = `${source.videoId}:${Math.round(source.startSeconds)}`;
  const tiered = [
    answer.bestBeginnerExplanation,
    answer.bestTechnicalExplanation,
    answer.bestPracticalExample,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Best answer</h2>
          {answer.confidenceLabel === "high" ? (
            <span className="rounded-full border border-amber-400/35 bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100">
              Best moment
            </span>
          ) : null}
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-100">
            {confidenceCopy(answer.confidenceLabel)}
          </span>
        </div>

        <blockquote className="border-l-2 border-emerald-300/40 pl-4 text-sm leading-7 text-slate-100 sm:text-base">
          &quot;{answer.answerSnippet}&quot;
        </blockquote>

        <p className="text-xs text-slate-400">
          Source:{" "}
          <Link href={source.videoPath} className="text-blue-200 hover:text-blue-100">
            {source.videoTitle}
          </Link>
          {source.channelName ? ` · ${source.channelName}` : ""} at {source.timestamp}
        </p>

        <MomentQualitySignals
          evaluation={answerQuality}
          momentId={answerMomentId}
          videoId={source.videoId}
          phrase={data.phrase}
          surface="search_result"
          compact
        />

        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-white">Jump to exact moment</h3>
          <p className="mt-2 text-sm text-slate-300">
            Recommended clip: {range.startLabel}–{range.endLabel} ({range.durationSeconds}s)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={answer.jumpUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                recordTimestampClickMilestone({ query: data.phrase, videoId: source.videoId });
                trackPersistentEvent("youtube_open", {
                  query: data.phrase,
                  videoId: source.videoId,
                  timestamp: range.startLabel,
                  surface: "best_answer",
                });
              }}
              className="inline-flex h-9 items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm text-emerald-100"
            >
              Play answer on YouTube
            </a>
            <Link
              href={source.momentPath}
              onClick={() =>
                trackPersistentEvent("search_result_click", {
                  query: data.phrase,
                  videoId: source.videoId,
                  surface: "best_answer_moment",
                })
              }
              className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200"
            >
              Open moment page
            </Link>
            <SaveMomentButton
              query={data.phrase}
              videoId={source.videoId}
              title={source.videoTitle}
              channel={source.channelName}
              timestamp={source.timestamp}
              snippet={answer.answerSnippet}
              youtubeUrl={answer.jumpUrl}
              momentPageUrl={source.momentPath}
            />
          </div>
          {(() => {
            const ctx: ViralShareContext = {
              query: data.phrase,
              videoTitle: source.videoTitle,
              channelName: source.channelName,
              snippet: answer.answerSnippet,
              timestampLabel: source.timestamp,
              youtubeUrl: answer.jumpUrl,
              momentPageUrl: `${getSiteUrl()}${source.momentPath}`,
              videoId: source.videoId,
            };
            return (
              <div className="mt-3">
                <ViralShareBlock context={ctx} compact />
              </div>
            );
          })()}
        </div>

        {tiered.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {tiered.map((tier) => (
              <div
                key={tier!.label}
                className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
              >
                <h3 className="text-sm font-semibold text-white">{tier!.label}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">&quot;{tier!.snippet}&quot;</p>
                <p className="mt-2 text-xs text-slate-500">{tier!.moment.videoTitle}</p>
              </div>
            ))}
          </div>
        ) : null}

        {data.synthesis.consensusExplanation ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <h3 className="text-sm font-semibold text-white">Consensus across indexed videos</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">{data.synthesis.consensusExplanation}</p>
            {data.synthesis.recurringThemes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.synthesis.recurringThemes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-100"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {answer.supportingMoments.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-white">Supporting moments</h3>
            <ul className="mt-3 space-y-3">
              {answer.supportingMoments.map((moment, index) => (
                <li
                  key={`${moment.videoId}-${moment.startSeconds}-${index}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-emerald-200">
                      {moment.timestamp}
                    </span>
                    <Link href={moment.videoPath} className="text-blue-200 hover:text-blue-100">
                      {moment.videoTitle}
                    </Link>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{moment.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {answer.relatedExplanations.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-white">Related explanations</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {answer.relatedExplanations.map((related) => (
                <Link
                  key={related.phrase}
                  href={related.href}
                  className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
                >
                  {related.phrase}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
