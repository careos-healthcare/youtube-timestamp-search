"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";
import type { IndexedVideo } from "@/lib/indexed-videos";
import { buildCreatorPath, buildTopicPath, buildVideoPath } from "@/lib/seo";

type LatestVideoCardProps = {
  video: IndexedVideo;
  position: number;
};

export function LatestVideoCard({ video, position }: LatestVideoCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const impressedRef = useRef(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || impressedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || impressedRef.current) return;
        impressedRef.current = true;
        trackEvent("indexed_video_impression", {
          videoId: video.videoId,
          position,
        });
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [position, video.videoId]);

  function handleOpen() {
    trackEvent("latest_video_open", { videoId: video.videoId, position });
  }

  function handleClick() {
    trackEvent("latest_video_click", { videoId: video.videoId, position });
  }

  return (
    <article
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 shadow-lg shadow-black/10 transition hover:border-blue-400/25 hover:shadow-blue-500/10"
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[168px_minmax(0,1fr)] sm:p-5">
        <Link
          href={buildVideoPath(video.videoId)}
          onClick={handleClick}
          className="block overflow-hidden rounded-xl border border-white/10 bg-black/30"
        >
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            width={320}
            height={180}
            className="h-full w-full object-cover"
            unoptimized
          />
        </Link>

        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs text-slate-400">
              Indexed {new Date(video.fetchedAt).toLocaleString()} · {video.segmentCount} segments
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              <Link href={buildVideoPath(video.videoId)} onClick={handleOpen} className="hover:text-blue-100">
                {video.title}
              </Link>
            </h2>
            {video.channelName ? <p className="mt-1 text-sm text-slate-300">{video.channelName}</p> : null}
          </div>

          <p className="line-clamp-3 text-sm leading-6 text-slate-300">{video.previewSnippet}</p>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildVideoPath(video.videoId)}
              onClick={handleOpen}
              className="inline-flex h-9 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 text-sm text-blue-100"
            >
              Search transcript
            </Link>
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleClick}
              className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-sm text-slate-200"
            >
              Watch on YouTube
            </a>
          </div>

          {video.relatedTopics.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Related topics</p>
              <div className="flex flex-wrap gap-2">
                {video.relatedTopics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={buildTopicPath(topic.slug)}
                    className="inline-flex h-8 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-xs text-emerald-100"
                  >
                    {topic.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {video.relatedCreators.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Related creators</p>
              <div className="flex flex-wrap gap-2">
                {video.relatedCreators.map((creator) => (
                  <Link
                    key={creator.slug}
                    href={buildCreatorPath(creator.slug)}
                    className="inline-flex h-8 items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 text-xs text-violet-100"
                  >
                    {creator.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
