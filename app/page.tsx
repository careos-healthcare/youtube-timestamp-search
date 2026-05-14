import type { Metadata } from "next";
import Link from "next/link";

import { CtaSection } from "@/components/cta-section";
import { FeaturedCreators } from "@/components/featured-creators";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { PopularTopicSearches } from "@/components/popular-topic-searches";
import { SearchForm } from "@/components/search-form";
import { buildTranscriptsIndexPath } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search YouTube Transcripts Instantly",
  description:
    "Paste a YouTube video link and find the exact timestamp where something is mentioned.",
};

export default function HomePage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              YouTube transcript utility
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Find the moment without scrubbing.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8">
              Paste a YouTube video link, search the transcript, and jump straight to the right
              timestamp.
            </p>
          </div>

          <SearchForm />
          <CtaSection />
        </div>
      </section>

      <PopularTopicSearches />

      <FeaturedCreators />

      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Indexed transcript library</h2>
            <p className="mt-1 text-sm text-slate-300">
              Reopen cached transcripts and search across videos indexed after prior lookups.
            </p>
          </div>
          <Link
            href={buildTranscriptsIndexPath()}
            className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100"
          >
            Browse indexed transcripts
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            Search long podcasts
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            Jump to exact timestamps
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
            No sign-up needed
          </div>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
