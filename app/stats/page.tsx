import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { getPublicStats } from "@/lib/public-stats";
import { buildSearchPath, buildTranscriptsIndexPath, buildVideoPath, getSiteUrl } from "@/lib/seo";
import { buildHomeStructuredData } from "@/lib/site-structured-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Public search index stats",
  description:
    "Live stats for the public video knowledge index: indexed videos, searchable moments, search demand, and newest indexed long-form videos.",
  alternates: {
    canonical: `${getSiteUrl()}/stats`,
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

export default async function StatsPage() {
  const stats = await getPublicStats();
  const structuredData = {
    ...buildHomeStructuredData(),
    "@graph": [
      ...(buildHomeStructuredData()["@graph"] ?? []),
      {
        "@type": "WebPage",
        "@id": `${getSiteUrl()}/stats`,
        url: `${getSiteUrl()}/stats`,
        name: "Public search index stats",
        description: "Indexed videos, searchable moments, and search demand for the video knowledge engine.",
      },
    ],
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-white/5 to-slate-950/80 p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-cyan-100 uppercase">
            Public index stats
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-5xl">Search index freshness</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Transparent stats for the searchable long-form video index. Updated as new videos are
            indexed and users search inside transcripts.
          </p>
          <p className="text-xs text-slate-500">
            Last updated {new Date(stats.generatedAt).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Indexed videos", value: formatNumber(stats.indexedVideos) },
          { label: "Searchable segments", value: formatNumber(stats.searchableSegments) },
          { label: "Indexed hours (est.)", value: `${stats.estimatedIndexedHours}h` },
          { label: "Searches performed", value: formatNumber(stats.searchesPerformed) },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Most searched topics</h2>
          <ol className="mt-4 space-y-2">
            {stats.mostSearchedTopics.map((topic, index) => (
              <li
                key={topic.query}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm"
              >
                <Link href={buildSearchPath(topic.query)} className="truncate text-blue-200 hover:text-blue-100">
                  {index + 1}. {topic.query}
                </Link>
                <span className="shrink-0 text-slate-400">{formatNumber(topic.count)}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Newest indexed videos</h2>
          <ol className="mt-4 space-y-2">
            {stats.newestIndexedVideos.map((video, index) => (
              <li
                key={video.videoId}
                className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm"
              >
                <Link href={buildVideoPath(video.videoId)} className="text-blue-200 hover:text-blue-100">
                  {index + 1}. {video.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {video.channelName ? `${video.channelName} · ` : ""}
                  {new Date(video.fetchedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={buildTranscriptsIndexPath()} className="text-blue-200 hover:text-blue-100">
            Browse video index
          </Link>
          <Link href="/topics" className="text-blue-200 hover:text-blue-100">
            Topic clusters
          </Link>
          <Link href="/" className="text-blue-200 hover:text-blue-100">
            Search inside a video
          </Link>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
