import type { Metadata } from "next";
import Link from "next/link";

import { MomentSharePanel } from "@/components/moment-share-panel";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { RelatedSearches } from "@/components/related-searches";
import { SearchForm } from "@/components/search-form";
import { TranscriptResults } from "@/components/transcript-results";
import { getIndexedVideoById } from "@/lib/indexed-videos";
import { buildMomentUrl, createMomentMetadata, deslugifyQuery } from "@/lib/seo";
import { fetchTranscriptByVideoId, TranscriptFetchError } from "@/lib/transcript-service";
import { hybridFindMatches } from "@/lib/search/per-video-hybrid-search";
import { suggestKeywords } from "@/lib/transcript-search";

type MomentPageProps = {
  params: Promise<{ videoId: string; query: string }>;
};

export async function generateMetadata({ params }: MomentPageProps): Promise<Metadata> {
  const { videoId, query } = await params;
  return createMomentMetadata(videoId, deslugifyQuery(query));
}

export default async function MomentPage({ params }: MomentPageProps) {
  const { videoId, query } = await params;
  const phrase = deslugifyQuery(query);
  const shareUrl = buildMomentUrl(videoId, phrase);
  const indexed = await getIndexedVideoById(videoId);
  let transcriptError = "";
  let results = [] as ReturnType<typeof hybridFindMatches>;
  let suggestions: string[] = [];

  try {
    const transcript = await fetchTranscriptByVideoId(videoId);
    results = hybridFindMatches(videoId, transcript, phrase);
    suggestions = suggestKeywords(transcript, phrase);
  } catch (error) {
    transcriptError =
      error instanceof TranscriptFetchError
        ? error.message
        : "Transcript unavailable for this video.";
  }

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Find &quot;{phrase}&quot; in this YouTube video
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Search YouTube transcript timestamps instantly for &quot;{phrase}&quot; in video{" "}
              {videoId}. This page is bookmarkable, shareable, and indexed with server-rendered
              transcript matches.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                New search
              </Link>
              <Link href={`/video/${videoId}`} className="text-blue-200 hover:text-blue-100">
                View full transcript page
              </Link>
              <Link href={`/search/${query}`} className="text-blue-200 hover:text-blue-100">
                Search &quot;{phrase}&quot; across videos
              </Link>
            </div>
          </div>

          <SearchForm initialVideoId={videoId} initialPhrase={phrase} />
        </div>
      </section>

      {transcriptError ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-red-300">
          {transcriptError}
        </section>
      ) : (
        <>
          <TranscriptResults
            results={results}
            searchedPhrase={phrase}
            videoId={videoId}
            shareUrl={shareUrl}
          />

          <MomentSharePanel
            videoId={videoId}
            phrase={phrase}
            videoTitle={indexed?.title ?? `Video ${videoId}`}
            channelName={indexed?.channelName}
            topResult={
              results[0]
                ? {
                    snippet: results[0].snippet,
                    timestamp: results[0].timestamp,
                    youtubeUrl: results[0].openUrl,
                    startSeconds: results[0].start,
                  }
                : undefined
            }
          />

          <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Server-rendered transcript index</h2>
            <div className="mt-3 space-y-3">
              {results.map((result) => (
                <article key={`seo-${result.start}`} className="text-sm text-slate-300">
                  <p>
                    <strong>{result.timestamp}</strong> {result.snippet}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <RelatedSearches
            videoId={videoId}
            keywords={suggestions}
            currentQuery={phrase}
          />
        </>
      )}

      <SiteFooter />
    </PageShell>
  );
}
