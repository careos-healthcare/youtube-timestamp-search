import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaSection } from "@/components/cta-section";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import { buildCreatorContent } from "@/lib/creator-content";
import {
  CREATOR_SLUGS,
  getCreatorBySlug,
  isCreatorSlug,
  normalizeCreatorSlug,
} from "@/lib/creator-data";
import {
  buildCreatorPath,
  buildCreatorsIndexPath,
  buildSearchPath,
  buildTopicPath,
  buildTopicsIndexPath,
  createCreatorMetadata,
} from "@/lib/seo";
import { formatTopicLabel } from "@/lib/topic-keywords";

type CreatorPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CREATOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeCreatorSlug(rawSlug);
  if (!isCreatorSlug(slug)) return {};
  return createCreatorMetadata(slug);
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeCreatorSlug(rawSlug);

  if (!isCreatorSlug(slug)) {
    notFound();
  }

  const creator = getCreatorBySlug(slug)!;
  const content = buildCreatorContent(slug)!;

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-violet-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-violet-100 uppercase">
              {content.categoryLabel}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">{content.h1}</h1>
            <p className="text-sm leading-7 text-slate-200 sm:text-lg">{content.intro}</p>
            {creator.aliases.length > 0 ? (
              <p className="text-xs text-slate-400">Also known as: {creator.aliases.join(", ")}</p>
            ) : null}
          </div>

          <SearchForm initialPhrase={creator.displayName} compact />

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">
              Why search {creator.displayName} transcripts?
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{content.explanation}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Popular searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.popularSearches.map((search) => (
              <Link
                key={search}
                href={buildSearchPath(search)}
                className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-3 text-sm text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-500/20"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Common transcript queries</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.commonQueries.map((query) => (
              <Link
                key={query}
                href={buildSearchPath(query)}
                className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200 transition hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-violet-100"
              >
                {query}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Searchable topics</h2>
        <p className="mt-2 text-sm text-slate-400">
          Jump to topic pages connected to {creator.displayName} content.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {content.searchableTopics.map((topic) => (
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
        <h2 className="text-base font-semibold text-white">FAQ</h2>
        <div className="mt-4 grid gap-3">
          {content.faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-violet-400/20"
            >
              <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Related creators</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {content.relatedCreators.map((relatedSlug) => (
            <Link
              key={relatedSlug}
              href={buildCreatorPath(relatedSlug)}
              className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 text-sm text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-400/20"
            >
              {getCreatorBySlug(relatedSlug)?.displayName ?? relatedSlug}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">More ways to search</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={buildCreatorsIndexPath()} className="text-violet-200 transition hover:text-violet-100">
            Browse all creators
          </Link>
          <Link href={buildTopicsIndexPath()} className="text-violet-200 transition hover:text-violet-100">
            Browse topics
          </Link>
          <Link href="/" className="text-violet-200 transition hover:text-violet-100">
            Homepage search
          </Link>
          <Link href="/search-podcast-transcripts" className="text-violet-200 transition hover:text-violet-100">
            Search podcast transcripts
          </Link>
        </div>
      </section>

      <CtaSection />
      <SiteFooter />
    </PageShell>
  );
}
