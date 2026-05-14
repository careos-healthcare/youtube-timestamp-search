"use client";

import Link from "next/link";
import { useState } from "react";

import { LatestVideoCard } from "@/components/latest-video-card";
import { trackEvent } from "@/lib/analytics";
import type { IndexedVideosPage } from "@/lib/indexed-videos";

type LatestVideosFeedProps = {
  initialPage: IndexedVideosPage;
  apiPath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
};

export function LatestVideosFeed({
  initialPage,
  apiPath = "/api/latest",
  emptyTitle = "No indexed videos yet",
  emptyDescription = "Search a YouTube video on the homepage to index its transcript and populate this feed.",
  emptyActionHref = "/",
  emptyActionLabel = "Start searching",
}: LatestVideosFeedProps) {
  const [videos, setVideos] = useState(initialPage.videos);
  const [offset, setOffset] = useState(initialPage.offset + initialPage.videos.length);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiPath}?offset=${offset}&limit=${initialPage.limit}`);
      const data = (await response.json()) as IndexedVideosPage & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not load more videos.");
        return;
      }

      setVideos((current) => [...current, ...data.videos]);
      setOffset(data.offset + data.videos.length);
      setHasMore(data.hasMore);
    } catch {
      setError("Could not load more videos.");
    } finally {
      setIsLoading(false);
    }
  }

  if (videos.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-white">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-slate-300">{emptyDescription}</p>
        <Link
          href={emptyActionHref}
          className="mt-4 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100"
        >
          {emptyActionLabel}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {videos.map((video, index) => (
          <LatestVideoCard key={video.videoId} video={video} position={index + 1} />
        ))}
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              trackEvent("latest_video_click", { action: "load_more", offset });
              void loadMore();
            }}
            disabled={isLoading}
            className="inline-flex h-11 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-5 text-sm font-medium text-blue-100 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load more videos"}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-400">You&apos;ve reached the end of indexed videos.</p>
      )}
    </div>
  );
}
