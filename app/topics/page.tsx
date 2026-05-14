import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { buildTopicPath, buildTopicsIndexPath, buildTranscriptsIndexPath, getSiteUrl } from "@/lib/seo";
import { getTopicsGroupedByCluster, TOPIC_DATABASE } from "@/lib/topic-keywords";

const title = "Browse YouTube transcript search topics";
const description =
  "Explore 200+ high-intent YouTube transcript search topics — podcasts, creators, coding, health, business, and more.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${getSiteUrl()}${buildTopicsIndexPath()}`,
  },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}${buildTopicsIndexPath()}`,
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

export default function TopicsIndexPage() {
  const groups = getTopicsGroupedByCluster();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex w-fit rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
            Topic index
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            YouTube transcript search topics
          </h1>
          <p className="text-sm leading-7 text-slate-200 sm:text-lg">
            Browse {TOPIC_DATABASE.length} SEO topic pages for podcasts, lectures, creators, coding,
            health, business, and more. Each page helps you search transcripts and jump to exact
            timestamps.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100 transition hover:border-blue-300/50 hover:bg-blue-500/20"
            >
              Back to search
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
            key={group.cluster}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{group.label}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {group.topics.length} transcript search {group.topics.length === 1 ? "topic" : "topics"}
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={buildTopicPath(topic.slug)}
                    className="flex h-full flex-col rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm transition hover:border-blue-300/30 hover:bg-blue-500/10"
                  >
                    <span className="font-medium text-white">{topic.displayName}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      {topic.description}
                    </span>
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
