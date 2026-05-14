import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import { SearchLandingResults } from "@/components/search-landing-results";
import { SearchQueryTracker } from "@/components/search-query-tracker";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { PRODUCT_WEDGE } from "@/lib/product-copy";
import {
  getSearchQuerySeed,
  phraseFromSearchSlug,
  SEARCH_QUERY_SLUGS,
} from "@/lib/search-query-seeds";
import { buildSearchLandingStructuredData } from "@/lib/search-structured-data";
import {
  buildTranscriptsIndexPath,
  createSearchMetadata,
} from "@/lib/seo";

export const revalidate = 300;
export const dynamicParams = true;

type SearchPageProps = {
  params: Promise<{ query: string }>;
};

export function generateStaticParams() {
  return SEARCH_QUERY_SLUGS.map((query) => ({ query }));
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { query } = await params;
  const seed = getSearchQuerySeed(query);
  const phrase = seed?.phrase ?? phraseFromSearchSlug(query);
  const title = seed?.title ?? `Search inside video for "${phrase}"`;
  const description =
    seed?.description ??
    `${PRODUCT_WEDGE} Find indexed YouTube video moments about "${phrase}" with exact timestamps.`;

  return createSearchMetadata(phrase, { title, description });
}

export default async function SearchQueryPage({ params }: SearchPageProps) {
  const { query } = await params;
  const phrase = getSearchQuerySeed(query)?.phrase ?? phraseFromSearchSlug(query);
  const landing = await getSearchLandingData(phrase);
  const structuredData = buildSearchLandingStructuredData(landing);

  return (
    <PageShell>
      <SearchQueryTracker query={phrase} resultCount={landing.moments.length} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              Video knowledge search
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Search inside video for &quot;{phrase}&quot;
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {PRODUCT_WEDGE} Browse indexed moments that mention &quot;{phrase}&quot; and open
              exact timestamps on YouTube.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                Paste a YouTube URL
              </Link>
              <Link href={buildTranscriptsIndexPath()} className="text-blue-200 hover:text-blue-100">
                Browse video index
              </Link>
            </div>
          </div>

          <SearchForm initialPhrase={phrase} />
        </div>
      </section>

      <SearchLandingResults data={landing} />

      <SiteFooter />
    </PageShell>
  );
}
