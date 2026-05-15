import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { TrendingSavedStrip } from "@/components/trending-saved-strip";
import { TrendingSearchesSection } from "@/components/trending-searches-section";
import { getLatestIndexedVideos } from "@/lib/indexed-videos";
import { PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildSearchPath, buildTopicPath, buildVideoPath, getSiteUrl } from "@/lib/seo";
import { AUTHORITY_TOPIC_SLUGS } from "@/lib/topic-cluster-engine";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { getTrendingSearches } from "@/lib/trending-searches";

export const metadata: Metadata = {
  title: "Trending & discovery",
  description: `${PRODUCT_TAGLINE} Explore what people are searching, newest indexed videos, and popular topics.`,
  alternates: { canonical: `${getSiteUrl()}/trending` },
};

export default async function TrendingPage() {
  const [trending, latest] = await Promise.all([getTrendingSearches(), getLatestIndexedVideos(10, 0)]);

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Trending & discovery</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {PRODUCT_TAGLINE} Real demand where analytics exists; curated seeds when the index is quiet.
        </p>
      </section>

      <TrendingSearchesSection data={trending} />

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
        <h2 className="text-base font-semibold text-white">Popular topics</h2>
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
