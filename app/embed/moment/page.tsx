import Link from "next/link";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { appendShareUtm } from "@/lib/clip-distribution";
import { buildMomentPath, buildSearchPath, getSiteUrl } from "@/lib/seo";
import { getYouTubeWatchUrl } from "@/lib/youtube";

type EmbedMomentPageProps = {
  searchParams: Promise<{
    videoId?: string;
    q?: string;
    t?: string;
    snippet?: string;
    channel?: string;
  }>;
};

export default async function EmbedMomentPage({ searchParams }: EmbedMomentPageProps) {
  const { videoId = "", q = "", t, snippet, channel } = await searchParams;
  const indexed = videoId ? await getIndexedVideoById(videoId) : null;
  const title = indexed?.title ?? `Video ${videoId}`;
  const channelName = channel ?? indexed?.channelName;
  const quote = snippet ?? indexed?.previewSnippet ?? "";
  const youtubeUrl = videoId ? getYouTubeWatchUrl(videoId, t ? parseTimestampSeconds(t) : undefined) : getSiteUrl();
  const momentPage = videoId && q ? `${getSiteUrl()}${buildMomentPath(videoId, q)}` : getSiteUrl();
  const trackedMoment = appendShareUtm(momentPage, {
    source: "embed",
    medium: "embed",
    campaign: "moment",
    content: videoId,
  });
  const trackedSearch =
    q.length > 0
      ? appendShareUtm(`${getSiteUrl()}${buildSearchPath(q)}`, {
          source: "embed",
          medium: "embed",
          campaign: "search",
          content: q,
        })
      : null;

  return (
    <main className="p-4">
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-300">Timestamp moment card</p>
        <h1 className="mt-2 text-base font-semibold text-white">{title}</h1>
        {channelName ? <p className="mt-1 text-xs text-slate-400">{channelName}</p> : null}
        {q ? <p className="mt-2 text-sm text-slate-300">Moment: &quot;{q}&quot;</p> : null}
        {t ? <p className="mt-1 text-sm font-medium text-emerald-200">{t}</p> : null}
        {quote ? (
          <blockquote className="mt-3 border-l-2 border-violet-300/30 pl-3 text-sm leading-7 text-slate-100">
            &quot;{quote.slice(0, 220)}&quot;
          </blockquote>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-3 text-sm text-blue-100"
          >
            Open on YouTube
          </a>
          {videoId && q ? (
            <Link
              href={trackedMoment}
              target="_blank"
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-sm text-slate-200"
            >
              View moment page
            </Link>
          ) : null}
          {trackedSearch ? (
            <Link
              href={trackedSearch}
              target="_blank"
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-sm text-slate-200"
            >
              Search all videos
            </Link>
          ) : null}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Powered by YouTube Time Search · transcript links only · no video rehosting
        </p>
      </div>
    </main>
  );
}

function parseTimestampSeconds(timestamp: string) {
  const parts = timestamp.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
