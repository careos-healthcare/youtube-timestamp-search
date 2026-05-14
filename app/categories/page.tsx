import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { getAllTranscriptCategories } from "@/lib/category-data";
import {
  buildCategoryPath,
  buildLatestPath,
  buildTopicsIndexPath,
  createCategoriesIndexMetadata,
  getSiteUrl,
} from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = createCategoriesIndexMetadata();

export default function CategoriesIndexPage() {
  const categories = getAllTranscriptCategories();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-cyan-100 uppercase">
            Category index
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Transcript discovery categories
          </h1>
          <p className="text-sm leading-7 text-slate-200 sm:text-lg">
            Browse indexed YouTube transcripts by category — programming tutorials, AI podcasts, business
            interviews, finance education, and self-improvement podcasts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100"
            >
              Back to search
            </Link>
            <Link
              href={buildLatestPath()}
              className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100"
            >
              Latest indexed videos
            </Link>
            <Link
              href={buildTopicsIndexPath()}
              className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100"
            >
              Browse topics
            </Link>
          </div>
        </div>
      </section>

      <ul className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={buildCategoryPath(category.slug)}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/30 hover:bg-cyan-500/10"
            >
              <span className="text-lg font-semibold text-white">{category.label}</span>
              <span className="mt-2 text-sm leading-7 text-slate-300">{category.description}</span>
              <span className="mt-4 text-xs text-cyan-100/80">
                {getSiteUrl()}
                {buildCategoryPath(category.slug)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <SiteFooter />
    </PageShell>
  );
}
