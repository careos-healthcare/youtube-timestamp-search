import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { TrendingPageViewTracker } from "@/components/trending-page-view-tracker";
import { TrendingSavedStrip } from "@/components/trending-saved-strip";
import { TrendingSearchesSection } from "@/components/trending-searches-section";
import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { getLatestIndexedVideos } from "@/lib/indexed-videos";
import { PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildCreatorPath, buildSearchPath, buildTopicPath, buildVideoPath, getSiteUrl } from "@/lib/seo";
import { AUTHORITY_TOPIC_SLUGS } from "@/lib/topic-cluster-engine";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { getTrendingSearches } from "@/lib/trending-searches";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Trending & discovery",
  description: `${PRODUCT_TAGLINE} Explore what people are searching, newest indexed videos, and popular topics.`,
  alternates: { canonical: `${getSiteUrl()}/trending` },
  robots: { index: true, follow: true },
};

const FEATURED_CREATORS = CREATOR_SEEDS.filter((c) => c.featured).slice(0, 12);

export default async function TrendingPage() {
  const [trending, latest] = await Promise.all([getTrendingSearches(), getLatestIndexedVideos(10, 0)]);

  return (
    <PageShell>
      <TrendingPageViewTracker />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold text-white">Trending & discovery</h1>
            <p className="text-sm text-slate-300">
              {PRODUCT_TAGLINE} Real demand where analytics exists; curated seeds when the index is quiet.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-500/15 px-5 text-sm font-semibold text-blue-50 hover:bg-blue-500/25"
          >
            ← Back to home search
          </Link>
        </div>
      </section>

      <TrendingSearchesSection data={trending} />

      <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Trending creators</h2>
        <p className="mt-1 text-xs text-slate-400">High-intent channels people open from search — jump into their indexed catalog.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FEATURED_CREATORS.map((c) => (
            <Link
              key={c.slug}
              href={buildCreatorPath(c.slug)}
              className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-100 hover:bg-white/10 sm:text-sm"
            >
              {c.displayName}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Want the full creator directory?{" "}
          <Link href="/creators" className="text-indigo-200 hover:text-indigo-100">
            Browse all creators
          </Link>
        </p>
      </section>

      <section className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Saved on this device</h2>
        <p className="mt-1 text-xs text-slate-400">Not synced — local highlights only.</p>
        <div className="mt-3">
          <TrendingSavedStrip />
        </div>
        <Link href="/saved" className="mt-3 inline-block text-sm text-blue-200 hover:text-blue-100">
          Open saved library
        </Link>
      </section>

      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Newest indexed videos</h2>
        <ul className="mt-3 space-y-2">
          {latest.videos.map((v) => (
            <li key={v.videoId}>
              <Link href={buildVideoPath(v.videoId)} className="text-sm text-blue-200 hover:text-blue-100">
                {v.title}
              </Link>
              {v.channelName ? <span className="ml-2 text-xs text-slate-500">{v.channelName}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Most shared topics</h2>
        <p className="mt-1 text-xs text-slate-400">
          Topic hubs people use as entry points into the index — each opens a curated keyword page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AUTHORITY_TOPIC_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={buildTopicPath(slug)}
              className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
            >
              {formatTopicLabel(slug)}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Try a topic, then jump to a search:{" "}
          <Link href={buildSearchPath("ai agents")} className="text-blue-200 hover:text-blue-100">
            ai agents
          </Link>
        </p>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
