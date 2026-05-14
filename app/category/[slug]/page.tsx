import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LatestVideosFeed } from "@/components/latest-videos-feed";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import {
  getTranscriptCategoryBySlug,
  normalizeCategorySlug,
  TRANSCRIPT_CATEGORY_SLUGS,
} from "@/lib/category-data";
import { getCreatorBySlug } from "@/lib/creator-data";
import { getIndexedVideosByCategory } from "@/lib/indexed-videos";
import {
  buildCategoriesIndexPath,
  buildCreatorPath,
  buildLatestPath,
  buildSearchPath,
  buildTopicPath,
  buildTopicsIndexPath,
  createCategoryMetadata,
} from "@/lib/seo";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";

export const revalidate = 60;

const PAGE_SIZE = 12;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return TRANSCRIPT_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  return createCategoryMetadata(normalizeCategorySlug(rawSlug));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeCategorySlug(rawSlug);
  const category = getTranscriptCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const initialPage = await getIndexedVideosByCategory(category.slug, PAGE_SIZE, 0);
  const configured = isSupabaseTranscriptStoreConfigured();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-cyan-100 uppercase">
              {category.shortLabel}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">{category.h1}</h1>
            <p className="text-sm leading-7 text-slate-200 sm:text-lg">{category.intro}</p>
          </div>

          <SearchForm initialPhrase={category.defaultSearchPhrase} compact />

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Why search {category.label.toLowerCase()}?</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{category.explanation}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Popular searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {category.popularSearches.map((search) => (
              <Link
                key={search}
                href={buildSearchPath(search)}
                className="inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-sm text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/20"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Explore more</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={buildLatestPath()}
              className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100"
            >
              Latest indexed videos
            </Link>
            <Link
              href={buildCategoriesIndexPath()}
              className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200"
            >
              All categories
            </Link>
            <Link
              href={buildTopicsIndexPath()}
              className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-sm text-emerald-100"
            >
              Browse topics
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Related topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {category.relatedTopics.map((topic) => (
            <Link
              key={topic}
              href={buildTopicPath(topic)}
              className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/20"
            >
              {formatTopicLabel(topic)}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Related creators</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {category.relatedCreators.map((creatorSlug) => {
            const creator = getCreatorBySlug(creatorSlug);
            if (!creator) return null;

            return (
              <Link
                key={creatorSlug}
                href={buildCreatorPath(creator.slug)}
                className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-3 text-sm text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-500/20"
              >
                {creator.displayName}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Latest in {category.label.toLowerCase()}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {configured
                ? `${initialPage.total} indexed ${initialPage.total === 1 ? "video" : "videos"} in this category`
                : "Showing cached transcripts for this category when available"}
            </p>
          </div>
          <Link
            href={buildLatestPath()}
            className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100"
          >
            View all latest
          </Link>
        </div>

        <LatestVideosFeed
          initialPage={initialPage}
          apiPath={`/api/category/${category.slug}`}
          emptyTitle={`No ${category.label.toLowerCase()} indexed yet`}
          emptyDescription={`Seed transcripts for this category or search a video on the homepage. Use category "${category.slug}" in your CSV when bulk indexing.`}
          emptyActionHref="/"
          emptyActionLabel="Search a video"
        />
      </section>

      <SiteFooter />
    </PageShell>
  );
}
