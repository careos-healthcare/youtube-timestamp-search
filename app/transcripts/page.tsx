import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { TranscriptIndexSearch } from "@/components/transcript-index-search";
import {
  buildSearchPath,
  buildTranscriptsIndexPath,
  buildVideoPath,
  getSiteUrl,
} from "@/lib/seo";
import { listCachedTranscripts, getTranscriptCacheMode } from "@/lib/transcript-cache";

const title = "Public video knowledge index";
const description =
  "Browse long-form YouTube videos indexed for in-video search. Reopen any video and search inside its transcript like a search engine index.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${getSiteUrl()}${buildTranscriptsIndexPath()}`,
  },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}${buildTranscriptsIndexPath()}`,
    type: "website",
    images: ["/og-placeholder.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-placeholder.svg"],
  },
};

export default async function TranscriptsIndexPage() {
  const cachedTranscripts = await listCachedTranscripts();
  const cacheMode = getTranscriptCacheMode();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-emerald-100 uppercase">
            Video knowledge index
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Public video knowledge index
          </h1>
          <p className="text-sm leading-7 text-slate-200 sm:text-lg">
            Long-form videos indexed for in-video search. Reopen any video and search inside its
            transcript without scrubbing.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
          >
            Back to homepage search
          </Link>
        </div>
      </section>

      {cacheMode === "fallback" ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Transcript index is running in temporary cache mode. Add Supabase env vars to persist
          transcripts across deployments. See `SUPABASE_TRANSCRIPT_INDEX_SETUP.md`.
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Transcript index is connected to Supabase Postgres. Cached transcripts persist across
          deployments.
          {cachedTranscripts.length > 0 ? ` ${cachedTranscripts.length} indexed.` : ""}
        </section>
      )}

      <TranscriptIndexSearch />

      {cachedTranscripts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
          <h2 className="text-lg font-semibold text-white">No indexed transcripts yet</h2>
          <p className="mt-2 text-sm text-slate-300">
            Search a YouTube video on the homepage to fetch and cache its transcript here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100"
          >
            Start a transcript search
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-white">
            Cached transcripts ({cachedTranscripts.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {cachedTranscripts.map((entry) => (
              <li
                key={entry.videoId}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:flex sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{entry.title ?? entry.videoId}</p>
                  {entry.channelName ? (
                    <p className="mt-1 text-xs text-slate-400">{entry.channelName}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.segmentCount} segments · fetched {new Date(entry.fetchedAt).toLocaleString()}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                  <Link
                    href={buildVideoPath(entry.videoId)}
                    className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100"
                  >
                    Open transcript
                  </Link>
                  <Link
                    href={buildSearchPath(entry.title ?? entry.videoId)}
                    className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200"
                  >
                    Quick search
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SiteFooter />
    </PageShell>
  );
}
