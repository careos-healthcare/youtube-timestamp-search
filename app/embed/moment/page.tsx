import Link from "next/link";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { buildMomentPath, getSiteUrl } from "@/lib/seo";
import { getYouTubeWatchUrl } from "@/lib/youtube";

type EmbedMomentPageProps = {
  searchParams: Promise<{ videoId?: string; q?: string; t?: string }>;
};

export default async function EmbedMomentPage({ searchParams }: EmbedMomentPageProps) {
  const { videoId = "", q = "", t } = await searchParams;
  const indexed = videoId ? await getIndexedVideoById(videoId) : null;
  const title = indexed?.title ?? `Video ${videoId}`;
  const youtubeUrl = videoId ? getYouTubeWatchUrl(videoId) : getSiteUrl();

  return (
    <main className="p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Timestamp card</p>
        <h1 className="mt-2 text-base font-semibold text-white">{title}</h1>
        {q ? <p className="mt-2 text-sm text-slate-300">Moment: &quot;{q}&quot;</p> : null}
        {t ? <p className="mt-1 text-sm text-emerald-200">{t}</p> : null}
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
              href={`${getSiteUrl()}${buildMomentPath(videoId, q)}`}
              target="_blank"
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-sm text-slate-200"
            >
              View moment page
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
