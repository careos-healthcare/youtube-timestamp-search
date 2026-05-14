import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import {
  buildCreatorPath,
  buildCreatorsIndexPath,
  buildTopicsIndexPath,
  buildTranscriptsIndexPath,
  getSiteUrl,
} from "@/lib/seo";
import { CREATOR_DATABASE, getCreatorsGroupedByCategory } from "@/lib/creator-data";
import { formatTopicLabel } from "@/lib/topic-keywords";

const title = "Browse creator transcript search pages";
const description =
  "Search YouTube transcripts for 100+ creators — podcasts, founders, educators, and tech channels with timestamp search.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${getSiteUrl()}${buildCreatorsIndexPath()}`,
  },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}${buildCreatorsIndexPath()}`,
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

export default function CreatorsIndexPage() {
  const groups = getCreatorsGroupedByCategory();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-violet-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex w-fit rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-violet-100 uppercase">
            Creator index
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Creator transcript search pages
          </h1>
          <p className="text-sm leading-7 text-slate-200 sm:text-lg">
            Browse {CREATOR_DATABASE.length} creator SEO pages for podcast transcript search, interview
            timestamps, and quotable moments on YouTube.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-500/20"
            >
              Back to search
            </Link>
            <Link
              href={buildTopicsIndexPath()}
              className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
            >
              Browse topics
            </Link>
            <Link
              href={buildTranscriptsIndexPath()}
              className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
            >
              Indexed transcripts
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {groups.map((group) => (
          <section
            key={group.category}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{group.label}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {group.creators.length} creator {group.creators.length === 1 ? "page" : "pages"}
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.creators.map((creator) => (
                <li key={creator.slug}>
                  <Link
                    href={buildCreatorPath(creator.slug)}
                    className="flex h-full flex-col rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm transition hover:border-violet-300/30 hover:bg-violet-500/10"
                  >
                    <span className="font-medium text-white">{creator.displayName}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      {creator.description}
                    </span>
                    {creator.popularTopics.length > 0 ? (
                      <span className="mt-2 text-[11px] text-violet-200/80">
                        Topics:{" "}
                        {creator.popularTopics
                          .slice(0, 3)
                          .map((t) => formatTopicLabel(t))
                          .join(", ")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <SiteFooter />
    </PageShell>
  );
}
