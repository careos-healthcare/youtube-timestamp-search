import Image from "next/image";
import Link from "next/link";

import { ShareActions } from "@/components/share-actions";
import { VideoWithinSearchForm } from "@/components/video-within-search-form";
import { getTranscriptCategoryBySlug } from "@/lib/category-data";
import type { IndexedVideo } from "@/lib/indexed-videos";
import { getYouTubeThumbnailUrl } from "@/lib/indexed-videos";
import {
  buildCategoriesIndexPath,
  buildCategoryPath,
  buildLatestPath,
  buildTopicPath,
  buildTranscriptsIndexPath,
  buildVideoPath,
  getSiteUrl,
} from "@/lib/seo";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { getYouTubeWatchUrl } from "@/lib/youtube";

type VideoPageShellProps = {
  videoId: string;
  indexed: IndexedVideo | null;
  structuredDataJson: string;
};

export function VideoPageShell({ videoId, indexed, structuredDataJson }: VideoPageShellProps) {
  const title = indexed?.title ?? `YouTube transcript search for ${videoId}`;
  const channelName = indexed?.channelName;
  const pageUrl = `${getSiteUrl()}${buildVideoPath(videoId)}`;
  const thumbnailUrl = getYouTubeThumbnailUrl(videoId);

  const categorySlug = indexed?.category;
  const category = categorySlug ? getTranscriptCategoryBySlug(categorySlug) : undefined;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <span className="inline-flex w-fit rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              Searchable video
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
            {channelName ? (
              <p className="text-sm text-slate-300 sm:text-base">
                Channel: <span className="text-white">{channelName}</span>
              </p>
            ) : null}
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Search inside this video for exact quotes, topics, and timestamps. Browse preview sections, jump to
              searchable moments, and open the right point without scrubbing.
            </p>

            <nav className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-slate-200 hover:bg-white/5"
              >
                Home
              </Link>
              <Link
                href={buildLatestPath()}
                className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-blue-100"
              >
                Latest
              </Link>
              <Link
                href={buildCategoriesIndexPath()}
                className="inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-100"
              >
                Categories
              </Link>
              <Link
                href={buildTranscriptsIndexPath()}
                className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-slate-200 hover:bg-white/5"
              >
                Transcript index
              </Link>
            </nav>

            {indexed?.segmentCount != null ? (
              <p className="text-xs text-emerald-200/80">
                Indexed transcript · {indexed.segmentCount} segment{indexed.segmentCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 lg:aspect-[16/10]">
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 220px"
              priority
            />
            <a
              href={getYouTubeWatchUrl(videoId)}
              className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/80 to-transparent p-3 text-sm font-medium text-white"
            >
              Watch on YouTube
            </a>
          </div>
        </div>
      </section>

      <VideoWithinSearchForm videoId={videoId} videoTitle={indexed?.title} />

      <ShareActions shareUrl={pageUrl} label="Share transcript page" />

      {category ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Category</h2>
          <p className="mt-1 text-sm text-slate-400">Browse more indexed videos in this discovery category.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={buildCategoryPath(category.slug)}
              className="inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-sm text-cyan-100"
            >
              {category.label}
            </Link>
            <Link
              href={buildCategoriesIndexPath()}
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-sm text-slate-200"
            >
              All categories
            </Link>
          </div>
          {indexed?.topic ? (
            <p className="mt-3 text-sm text-slate-400">
              Indexed topic tag:{" "}
              <Link href={buildTopicPath(indexed.topic)} className="text-emerald-200 hover:text-emerald-100">
                {formatTopicLabel(indexed.topic)}
              </Link>
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Browse by category</h2>
          <p className="mt-1 text-sm text-slate-400">
            Explore indexed transcripts grouped by programming, AI, business, finance, and self-improvement.
          </p>
          <Link
            href={buildCategoriesIndexPath()}
            className="mt-4 inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-sm text-cyan-100"
          >
            View categories
          </Link>
        </section>
      )}
    </>
  );
}

export function VideoPageHeavyFallback() {
  return (
    <section className="space-y-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-amber-50">Transcript sections loading</h2>
      <p className="text-sm text-amber-100/90">
        This page opens the searchable shell first. Preview sections, topics, and related links stream in next. Very
        long transcripts may show a partial preview while staying searchable from the box above.
      </p>
      <div className="mt-4 space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-white/10" />
        <div className="h-40 animate-pulse rounded-xl bg-white/10" />
      </div>
    </section>
  );
}
