import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { ShareActions } from "@/components/share-actions";
import { RelatedSearches } from "@/components/related-searches";
import { SearchForm } from "@/components/search-form";
import {
  buildCreatorPath,
  buildTopicPath,
  buildTranscriptsIndexPath,
  buildLatestPath,
  buildVideoPath,
  createVideoMetadata,
  getSiteUrl,
} from "@/lib/seo";
import { getTranscriptForVideo, TranscriptFetchError } from "@/lib/transcript-service";
import { getCachedTranscript } from "@/lib/transcript-cache";
import { getTranscriptPreview, suggestKeywords } from "@/lib/transcript-search";
import {
  getRelatedCreatorsForKeywords,
  getRelatedTopicsForKeywords,
} from "@/lib/video-related-links";
import { getRelatedIndexedVideos } from "@/lib/indexed-videos";
import { formatTimestampFromMs, getYouTubeWatchUrl } from "@/lib/youtube";

type VideoPageProps = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const cached = await getCachedTranscript(videoId);
  return createVideoMetadata(videoId, {
    title: cached?.title,
    channelName: cached?.channelName,
  });
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = await params;
  let transcriptError = "";
  let transcript = [] as Awaited<ReturnType<typeof getTranscriptForVideo>>["lines"];
  let title: string | undefined;
  let channelName: string | undefined;
  let fetchedAt: string | undefined;
  let fromCache = false;

  try {
    const result = await getTranscriptForVideo(videoId);
    transcript = result.lines;
    title = result.metadata.title;
    channelName = result.metadata.channelName;
    fetchedAt = result.metadata.fetchedAt;
    fromCache = result.metadata.fromCache;
  } catch (error) {
    transcriptError =
      error instanceof TranscriptFetchError
        ? error.message
        : "Transcript unavailable for this video.";
  }

  const preview = getTranscriptPreview(transcript, 20);
  const suggestions = suggestKeywords(transcript, "");
  const relatedTopics = getRelatedTopicsForKeywords(suggestions);
  const relatedCreators = getRelatedCreatorsForKeywords(suggestions);
  const relatedVideos = await getRelatedIndexedVideos(videoId, 4);
  const pageUrl = `${getSiteUrl()}${buildVideoPath(videoId)}`;

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Search transcript for {title ?? `video ${videoId}`}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {channelName
                ? `Search the YouTube transcript for ${channelName}. Find exact timestamps without scrubbing.`
                : `Search YouTube transcript timestamps for video ${videoId}. Find the exact moment without scrubbing.`}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                Back to search
              </Link>
              <Link href={buildTranscriptsIndexPath()} className="text-blue-200 hover:text-blue-100">
                Indexed transcripts
              </Link>
              <Link href={buildLatestPath()} className="text-blue-200 hover:text-blue-100">
                Latest videos
              </Link>
            </div>
            {fromCache && fetchedAt ? (
              <p className="text-xs text-emerald-200/80">
                Indexed transcript loaded from cache · fetched {new Date(fetchedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <SearchForm initialVideoId={videoId} />
          <ShareActions shareUrl={pageUrl} label="Share transcript page" />

          {transcriptError ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-red-300">{transcriptError}</p>
              <p className="text-sm text-slate-400">
                Paste the video URL above and search a phrase to fetch and cache the transcript.
              </p>
            </div>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <h2 className="text-sm font-semibold text-slate-200">Indexed transcript preview</h2>
              <div className="mt-3 space-y-3">
                {preview.map((line) => (
                  <article key={`${line.start}-${line.text.slice(0, 24)}`} className="text-sm">
                    <p className="font-medium text-emerald-200">
                      {formatTimestampFromMs(line.start * 1000)}
                    </p>
                    <p className="leading-6 text-slate-300">{line.text}</p>
                    <a
                      href={getYouTubeWatchUrl(videoId, line.start)}
                      className="text-blue-200 hover:text-blue-100"
                    >
                      Open at this moment
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {!transcriptError && <RelatedSearches videoId={videoId} keywords={suggestions} />}

      {!transcriptError && relatedTopics.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related topic pages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={buildTopicPath(topic.slug)}
                className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100"
              >
                {topic.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!transcriptError && relatedCreators.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related creator pages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedCreators.map((creator) => (
              <Link
                key={creator.slug}
                href={buildCreatorPath(creator.slug)}
                className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 text-sm text-violet-100"
              >
                {creator.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!transcriptError && relatedVideos.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related searchable videos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedVideos.map((related) => (
              <Link
                key={related.videoId}
                href={buildVideoPath(related.videoId)}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-3 transition hover:border-blue-300/30 hover:bg-blue-500/10"
              >
                <p className="text-sm font-medium text-white">{related.title}</p>
                {related.channelName ? (
                  <p className="mt-1 text-xs text-slate-400">{related.channelName}</p>
                ) : null}
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{related.previewSnippet}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </PageShell>
  );
}
