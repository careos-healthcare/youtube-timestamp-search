import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BestMomentsSection } from "@/components/best-moments-section";
import { InternalLinksPanel } from "@/components/internal-links-panel";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { RelatedSearches } from "@/components/related-searches";
import { ShareActions } from "@/components/share-actions";
import { VideoWithinSearchForm } from "@/components/video-within-search-form";
import { getTranscriptCategoryBySlug } from "@/lib/category-data";
import {
  getIndexedVideoById,
  getRelatedIndexedVideos,
  getYouTubeThumbnailUrl,
} from "@/lib/indexed-videos";
import {
  buildCategoriesIndexPath,
  buildCategoryPath,
  buildLatestPath,
  buildMomentPath,
  buildTopicPath,
  buildTopicsIndexPath,
  buildTranscriptsIndexPath,
  buildVideoPath,
  createVideoMetadata,
  getSiteUrl,
} from "@/lib/seo";
import { getCachedTranscript } from "@/lib/transcript-cache";
import { suggestKeywords } from "@/lib/transcript-search";
import { getTranscriptForVideo, TranscriptFetchError } from "@/lib/transcript-service";
import { formatTopicLabel } from "@/lib/topic-keywords";
import {
  buildSearchableMoments,
  buildTranscriptPreviewSections,
} from "@/lib/video-landing";
import {
  buildVideoStructuredData,
  getCategoryLabelForSlug,
} from "@/lib/video-structured-data";
import {
  getRelatedTopicsForKeywords,
} from "@/lib/video-related-links";
import { ChannelMomentsSection } from "@/components/channel-moments-section";
import { getChannelCorpusMoments } from "@/lib/channel-corpus-search";
import { extractBestMoments } from "@/lib/best-moments";
import { buildInternalLinkGraph } from "@/lib/internal-linking";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export const revalidate = 60;

type VideoPageProps = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const indexed = await getIndexedVideoById(videoId);
  const cached = indexed ? null : await getCachedTranscript(videoId);
  const title = indexed?.title ?? cached?.title;
  const channelName = indexed?.channelName ?? cached?.channelName;
  const segmentCount = indexed?.segmentCount ?? cached?.segments.length;

  return createVideoMetadata(videoId, {
    title,
    channelName,
    thumbnailUrl: getYouTubeThumbnailUrl(videoId),
    segmentCount,
    description: title
      ? `Search inside this indexed long-form video: "${title}"${channelName ? ` from ${channelName}` : ""}. Browse preview sections, searchable moments, and jump to exact timestamps.`
      : undefined,
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

  const indexed = await getIndexedVideoById(videoId);
  title = title ?? indexed?.title;
  channelName = channelName ?? indexed?.channelName;
  fetchedAt = fetchedAt ?? indexed?.fetchedAt;

  const suggestions = suggestKeywords(transcript, "", 10);
  const relatedTopics = getRelatedTopicsForKeywords(suggestions, 8);
  const relatedVideos = await getRelatedIndexedVideos(videoId, 4);
  const previewSections = buildTranscriptPreviewSections(transcript, {
    linesPerSection: 12,
    maxSections: 8,
  });
  const searchableMoments = buildSearchableMoments(videoId, transcript, suggestions, 8);
  const bestMoments = extractBestMoments(videoId, transcript, 8);
  const channelPhrase = suggestions[0] ?? title ?? "highlights";
  const channelMoments =
    channelName && transcript.length > 0
      ? await getChannelCorpusMoments(channelName, channelPhrase, {
          excludeVideoId: videoId,
          limit: 6,
        })
      : [];
  const internalLinks = buildInternalLinkGraph({
    phrase: title ?? videoId,
    videoKeywords: suggestions,
    topVideos: relatedVideos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
    })),
  });
  const pageUrl = `${getSiteUrl()}${buildVideoPath(videoId)}`;
  const thumbnailUrl = getYouTubeThumbnailUrl(videoId);

  const categorySlug = indexed?.category;
  const category = categorySlug ? getTranscriptCategoryBySlug(categorySlug) : undefined;
  const categoryLabel = category?.label ?? (categorySlug ? getCategoryLabelForSlug(categorySlug) : undefined);

  const structuredData = buildVideoStructuredData(
    {
      videoId,
      title: title ?? `YouTube video ${videoId}`,
      description: `Searchable YouTube transcript for ${title ?? videoId}${channelName ? ` from ${channelName}` : ""}.`,
      channelName,
      fetchedAt,
      segmentCount: transcript.length || indexed?.segmentCount,
      categoryLabel,
    },
    { discussedTopics: suggestions }
  );

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <span className="inline-flex w-fit rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              Searchable video
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {title ?? `YouTube transcript search for ${videoId}`}
            </h1>
            {channelName ? (
              <p className="text-sm text-slate-300 sm:text-base">
                Channel: <span className="text-white">{channelName}</span>
              </p>
            ) : null}
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Search inside this video for exact quotes, topics, and timestamps. Browse preview
              sections, jump to searchable moments, and open the right point without scrubbing.
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

            {fromCache && fetchedAt ? (
              <p className="text-xs text-emerald-200/80">
                Indexed transcript · fetched {new Date(fetchedAt).toLocaleString()}
                {transcript.length > 0 ? ` · ${transcript.length} segments` : ""}
              </p>
            ) : null}
          </div>

          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 lg:aspect-[16/10]">
            <Image
              src={thumbnailUrl}
              alt={title ?? `YouTube video ${videoId}`}
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

      <VideoWithinSearchForm videoId={videoId} videoTitle={title} />

      <ShareActions shareUrl={pageUrl} label="Share transcript page" />

      {transcriptError ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-sm text-red-300">{transcriptError}</p>
          <p className="text-sm text-slate-400">
            Paste the video URL on the homepage to fetch and cache the transcript.
          </p>
          <Link href="/" className="text-sm text-blue-200 hover:text-blue-100">
            Go to search
          </Link>
        </section>
      ) : (
        <>
          <BestMomentsSection moments={bestMoments} />

          {searchableMoments.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <h2 className="text-base font-semibold text-white">Searchable moments</h2>
              <p className="mt-1 text-sm text-slate-400">
                High-signal keywords from this transcript with jump links to exact timestamps.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {searchableMoments.map((moment) => (
                  <Link
                    key={`${moment.keyword}-${moment.start}`}
                    href={moment.momentPath}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-3 transition hover:border-blue-300/30 hover:bg-blue-500/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{moment.keyword}</span>
                      <span className="text-xs font-medium text-emerald-200">{moment.timestamp}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{moment.snippet}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {previewSections.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
              <h2 className="text-base font-semibold text-white">Transcript preview sections</h2>
              <p className="mt-1 text-sm text-slate-400">
                Scrollable excerpt from the indexed transcript, grouped by timestamp.
              </p>
              <div className="mt-5 space-y-5">
                {previewSections.map((section) => (
                  <article
                    key={section.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-emerald-200">
                        Starts at {section.startTimestamp}
                      </h3>
                      <a
                        href={getYouTubeWatchUrl(videoId, section.startSeconds)}
                        className="text-xs text-blue-200 hover:text-blue-100"
                      >
                        Open on YouTube
                      </a>
                    </div>
                    <div className="space-y-3">
                      {section.lines.map((line) => (
                        <div key={`${line.start}-${line.text.slice(0, 24)}`}>
                          <p className="text-[11px] font-medium text-slate-500">{line.timestamp}</p>
                          <p className="text-sm leading-6 text-slate-300">{line.text}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {!transcriptError && suggestions.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Key discussed topics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search this video or explore the same topics across the public index.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((topic) => (
              <Link
                key={topic}
                href={buildMomentPath(videoId, topic)}
                className="inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-sm text-cyan-100"
              >
                {topic}
              </Link>
            ))}
          </div>
          {internalLinks.videoPhraseLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {internalLinks.videoPhraseLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5"
                >
                  Search: {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {!transcriptError ? <RelatedSearches videoId={videoId} keywords={suggestions.slice(0, 8)} /> : null}

      {!transcriptError && relatedTopics.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related searches</h2>
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

      {category ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Category</h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse more indexed videos in this discovery category.
          </p>
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

      {!transcriptError && relatedVideos.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">More searchable videos</h2>
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
          <Link
            href={buildLatestPath()}
            className="mt-4 inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100"
          >
            View latest indexed videos
          </Link>
        </section>
      ) : null}

      {!transcriptError && suggestions.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-400">
          Try a moment search like{" "}
          <Link
            href={buildMomentPath(videoId, suggestions[0])}
            className="text-blue-200 hover:text-blue-100"
          >
            {suggestions[0]}
          </Link>{" "}
          or explore{" "}
          <Link href={buildTopicsIndexPath()} className="text-emerald-200 hover:text-emerald-100">
            topic pages
          </Link>
          .
        </section>
      ) : null}

      {!transcriptError && channelName ? (
        <ChannelMomentsSection
          channelName={channelName}
          phrase={channelPhrase}
          moments={channelMoments}
        />
      ) : null}

      <InternalLinksPanel
        relatedPhrases={internalLinks.relatedPhrases}
        relatedTopics={internalLinks.relatedTopics}
        relatedVideos={internalLinks.relatedVideos}
      />

      <SiteFooter />
    </PageShell>
  );
}
