import Link from "next/link";

import { BestMomentsSection } from "@/components/best-moments-section";
import { ChannelMomentsSection } from "@/components/channel-moments-section";
import { InternalLinksPanel } from "@/components/internal-links-panel";
import { RelatedSearches } from "@/components/related-searches";
import type { IndexedVideo } from "@/lib/indexed-videos";
import {
  loadVideoPageHeavyPayload,
} from "@/lib/load-video-page-heavy";
import {
  buildLatestPath,
  buildMomentPath,
  buildTopicPath,
  buildTopicsIndexPath,
  buildVideoPath,
} from "@/lib/seo";
import { getYouTubeWatchUrl } from "@/lib/youtube";

type VideoPageHeavyProps = {
  videoId: string;
  indexed: IndexedVideo | null;
};

export async function VideoPageHeavy({ videoId, indexed }: VideoPageHeavyProps) {
  const payload = await loadVideoPageHeavyPayload(videoId, indexed);

  const {
    transcriptError,
    suggestions,
    relatedTopics,
    relatedVideos,
    previewSections,
    searchableMoments,
    bestMoments,
    channelMoments,
    internalLinks,
    timedOut,
    showSlowOrPartialBanner,
    channelName,
  } = payload;

  const channelPhrase = suggestions[0] ?? payload.title ?? "highlights";

  return (
    <>
      {timedOut ? (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          The transcript index took longer than usual to assemble this page. The search box above still works on this
          video; try again in a moment or paste the URL on the homepage.
        </section>
      ) : null}

      {!timedOut && showSlowOrPartialBanner && !transcriptError ? (
        <section className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Part of this transcript was skipped for speed on this request. Search above still targets the full index when
          available.
        </section>
      ) : null}

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
    </>
  );
}
