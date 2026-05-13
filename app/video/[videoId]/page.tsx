import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { RelatedSearches } from "@/components/related-searches";
import { SearchForm } from "@/components/search-form";
import { createVideoMetadata } from "@/lib/seo";
import { fetchTranscriptByVideoId, TranscriptFetchError } from "@/lib/transcript-service";
import { getTranscriptPreview, suggestKeywords } from "@/lib/transcript-search";
import { formatTimestampFromMs, getYouTubeWatchUrl } from "@/lib/youtube";

type VideoPageProps = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  return createVideoMetadata(videoId);
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = await params;
  let transcriptError = "";
  let transcript = [] as Awaited<ReturnType<typeof fetchTranscriptByVideoId>>;

  try {
    transcript = await fetchTranscriptByVideoId(videoId);
  } catch (error) {
    transcriptError =
      error instanceof TranscriptFetchError
        ? error.message
        : "Transcript unavailable for this video.";
  }

  const preview = getTranscriptPreview(transcript, 20);
  const suggestions = suggestKeywords(transcript, "");

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Search this YouTube transcript
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Search YouTube transcript timestamps for video {videoId}. Find the exact moment
              without scrubbing.
            </p>
            <p className="text-sm text-slate-400">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                Back to search
              </Link>
            </p>
          </div>

          <SearchForm initialVideoId={videoId} />

          {transcriptError ? (
            <p className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-red-300">
              {transcriptError}
            </p>
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

      {!transcriptError && (
        <RelatedSearches videoId={videoId} keywords={suggestions} />
      )}

      <SiteFooter />
    </PageShell>
  );
}
