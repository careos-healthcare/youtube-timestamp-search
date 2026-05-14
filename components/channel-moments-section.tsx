import Link from "next/link";

import type { ChannelMoment } from "@/lib/channel-corpus-search";
import { buildSearchPath } from "@/lib/seo";

type ChannelMomentsSectionProps = {
  channelName: string;
  phrase: string;
  moments: ChannelMoment[];
};

export function ChannelMomentsSection({
  channelName,
  phrase,
  moments,
}: ChannelMomentsSectionProps) {
  if (moments.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white">
        More moments from {channelName}
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Search this creator&apos;s indexed transcript corpus for &quot;{phrase}&quot;.
      </p>
      <div className="mt-4 grid gap-3">
        {moments.map((moment) => (
          <article
            key={`${moment.videoId}-${moment.startSeconds}`}
            className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100">
                {moment.timestamp}
              </span>
              <Link href={moment.videoPath} className="text-blue-200 hover:text-blue-100">
                {moment.videoTitle}
              </Link>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{moment.snippet}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={moment.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 text-xs text-blue-100"
              >
                Open on YouTube
              </a>
              <Link
                href={moment.momentPath}
                className="inline-flex h-8 items-center rounded-lg border border-white/10 px-3 text-xs text-slate-200"
              >
                View moment
              </Link>
            </div>
          </article>
        ))}
      </div>
      <Link
        href={buildSearchPath(phrase)}
        className="mt-4 inline-flex text-sm text-fuchsia-200 hover:text-fuchsia-100"
      >
        Search &quot;{phrase}&quot; across all indexed videos
      </Link>
    </section>
  );
}
