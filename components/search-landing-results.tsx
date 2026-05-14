"use client";

import Link from "next/link";

import { trackPersistentEvent } from "@/lib/analytics";
import type { SearchLandingData } from "@/lib/search-landing-engine";
import { buildSearchPath } from "@/lib/seo";

type SearchLandingResultsProps = {
  data: SearchLandingData;
};

export function SearchLandingResults({ data }: SearchLandingResultsProps) {
  if (data.moments.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <p className="text-sm text-slate-300">
        {data.moments.length} moment{data.moments.length === 1 ? "" : "s"} across{" "}
        {data.videoCount} indexed video{data.videoCount === 1 ? "" : "s"}.
      </p>

      {data.moments.map((moment, index) => (
        <article
          key={`${moment.videoId}-${moment.startSeconds}-${index}`}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-200">
                {moment.timestamp}
              </span>
              <Link
                href={moment.videoPath}
                onClick={() =>
                  trackPersistentEvent("search_result_click", {
                    query: data.phrase,
                    videoId: moment.videoId,
                    position: index + 1,
                  })
                }
                className="text-blue-200 hover:text-blue-100"
              >
                {moment.videoTitle}
              </Link>
              {moment.channelName ? <span>· {moment.channelName}</span> : null}
            </div>
            <p className="text-sm leading-7 text-slate-200">{moment.snippet}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={moment.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackPersistentEvent("youtube_open", {
                    query: data.phrase,
                    videoId: moment.videoId,
                    timestamp: moment.timestamp,
                  })
                }
                className="inline-flex h-9 items-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 text-sm text-blue-100"
              >
                Open on YouTube
              </a>
              <Link
                href={moment.momentPath}
                onClick={() =>
                  trackPersistentEvent("search_result_click", {
                    query: data.phrase,
                    videoId: moment.videoId,
                    surface: "moment",
                  })
                }
                className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200"
              >
                View moment page
              </Link>
            </div>
          </div>
        </article>
      ))}

      {data.topVideos.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Related indexed videos</h2>
          <ul className="mt-3 space-y-2">
            {data.topVideos.map((video) => (
              <li key={video.videoId}>
                <Link href={video.videoPath} className="text-sm text-blue-200 hover:text-blue-100">
                  {video.title}
                </Link>
                <span className="ml-2 text-xs text-slate-500">{video.matchCount} matches</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.peopleAlsoSearched.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">People also searched</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.peopleAlsoSearched.map((related) => (
              <Link
                key={related.phrase}
                href={related.href}
                className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
              >
                {related.phrase}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {data.relatedPhrases.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Related searches</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.relatedPhrases.map((related) => (
              <Link
                key={related}
                href={buildSearchPath(related)}
                className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
              >
                {related}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
