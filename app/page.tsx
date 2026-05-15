import type { Metadata } from "next";
import Link from "next/link";

import { CtaSection } from "@/components/cta-section";
import { EmailDigestPrompt } from "@/components/email-digest-prompt";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { RecentSearchesPanel } from "@/components/recent-searches-panel";
import { SearchForm } from "@/components/search-form";
import {
  PRODUCT_BADGE,
  PRODUCT_DESCRIPTION,
  PRODUCT_META_DESCRIPTION,
  PRODUCT_META_TITLE,
  PRODUCT_TAGLINE,
  PRODUCT_WEDGE,
} from "@/lib/product-copy";
import { TrendingSearchesSection } from "@/components/trending-searches-section";
import { getTrendingSearches } from "@/lib/trending-searches";
import { buildHomeStructuredData } from "@/lib/site-structured-data";
import { buildCategoriesIndexPath, buildTranscriptsIndexPath, buildLatestPath, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: PRODUCT_META_TITLE,
  description: PRODUCT_META_DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    title: PRODUCT_META_TITLE,
    description: PRODUCT_META_DESCRIPTION,
    url: getSiteUrl(),
    type: "website",
    images: ["/og-placeholder.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_META_TITLE,
    description: PRODUCT_META_DESCRIPTION,
    images: ["/og-placeholder.svg"],
  },
};

export default async function HomePage() {
  const structuredData = buildHomeStructuredData();
  const trending = await getTrendingSearches();

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              {PRODUCT_BADGE}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {PRODUCT_TAGLINE}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8">
              {PRODUCT_WEDGE} {PRODUCT_DESCRIPTION}
            </p>
          </div>

          <SearchForm source="homepage" />
          <RecentSearchesPanel />
          <EmailDigestPrompt />
          <CtaSection />
        </div>
      </section>

      <TrendingSearchesSection data={trending} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center sm:p-5">
        <Link
          href="/trending"
          className="text-sm font-medium text-blue-200 hover:text-blue-100"
        >
          Open full trending & discovery hub
        </Link>
      </section>

      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Public video knowledge index</h2>
            <p className="mt-1 text-sm text-slate-300">
              Reopen indexed long-form videos and search across transcript text like a search engine
              index.
            </p>
          </div>
          <Link
            href={buildTranscriptsIndexPath()}
            className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100"
          >
            Browse the index
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-400/15 bg-blue-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Latest indexed videos</h2>
            <p className="mt-1 text-sm text-slate-300">
              New long-form lectures, podcasts, and tutorials added to the searchable corpus.
            </p>
          </div>
          <Link
            href={buildLatestPath()}
            className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100"
          >
            View latest
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Browse by subject</h2>
            <p className="mt-1 text-sm text-slate-300">
              Programming, AI, business, finance, and self-improvement — indexed for in-video search.
            </p>
          </div>
          <Link
            href={buildCategoriesIndexPath()}
            className="inline-flex h-10 items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100"
          >
            View categories
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            Search inside any long video transcript
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            Jump to exact useful moments instantly
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            No accounts, feeds, or creator tools
          </div>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
