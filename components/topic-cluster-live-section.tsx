import Link from "next/link";

import type { TopicClusterData } from "@/lib/topic-cluster-engine";
import { buildSearchPath, buildTopicPath } from "@/lib/seo";

type TopicClusterLiveSectionProps = {
  data: TopicClusterData;
};

export function TopicClusterLiveSection({ data }: TopicClusterLiveSectionProps) {
  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">
          Indexed moments for {data.label.toLowerCase()}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {data.landing.moments.length} moment{data.landing.moments.length === 1 ? "" : "s"} across{" "}
          {data.landing.videoCount} video{data.landing.videoCount === 1 ? "" : "s"} for &quot;
          {data.searchPhrase}&quot;.
        </p>
      </div>

      {data.landing.moments.length > 0 ? (
        <div className="grid gap-3">
          {data.landing.moments.slice(0, 12).map((moment, index) => (
            <article
              key={`${moment.videoId}-${moment.startSeconds}-${index}`}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-200">
                  {moment.timestamp}
                </span>
                <Link href={moment.videoPath} className="text-blue-200 hover:text-blue-100">
                  {moment.videoTitle}
                </Link>
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
                  View moment
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          No indexed moments yet for this topic cluster. Paste a YouTube URL on the homepage to
          search inside a specific video immediately.
        </div>
      )}

      {data.landing.topVideos.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">Best videos for this topic</h3>
          <ul className="mt-3 space-y-2">
            {data.landing.topVideos.map((video) => (
              <li key={video.videoId}>
                <Link href={video.videoPath} className="text-sm text-blue-200 hover:text-blue-100">
                  {video.title}
                </Link>
                <span className="ml-2 text-xs text-slate-500">{video.matchCount} matches</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white">Related search phrases</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.relatedSearchLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white">Related topic clusters</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.relatedTopics.map((topic) => (
            <Link
              key={topic.slug}
              href={buildTopicPath(topic.slug)}
              className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-sm text-emerald-100"
            >
              {topic.label}
            </Link>
          ))}
        </div>
        <Link
          href={buildSearchPath(data.searchPhrase)}
          className="mt-4 inline-flex text-sm text-blue-200 hover:text-blue-100"
        >
          View full search results for {data.searchPhrase}
        </Link>
      </div>
    </section>
  );
}
