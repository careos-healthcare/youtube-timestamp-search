import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { PRODUCT_WEDGE } from "@/lib/product-copy";
import { getSearchQuerySeed } from "@/lib/search-query-seeds";
import {
  resolveSearchQuery,
  shouldNoIndexSearchPage,
} from "@/lib/search-query-guard";
import {
  createSearchMetadata,
} from "@/lib/seo";

import { SearchLandingDeferred } from "./search-landing-deferred";
import { SearchLandingShell } from "./search-landing-shell";

export const revalidate = 300;
export const dynamicParams = true;
export const maxDuration = 30;

type SearchPageProps = {
  params: Promise<{ query: string }>;
};

/** No paths are pre-rendered at `next build`; first request fills the ISR cache (see `revalidate`). */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { query } = await params;
  const seed = getSearchQuerySeed(query);
  const resolved = resolveSearchQuery(query, 0);

  if (!resolved.isValid) {
    return {};
  }

  const title = seed?.title ?? `Exact video moments for "${resolved.phrase}"`;
  const description =
    seed?.description ??
    `${PRODUCT_WEDGE} Search indexed YouTube transcript moments for "${resolved.phrase}".`;

  return createSearchMetadata(resolved.phrase, {
    title,
    description,
    noindex: shouldNoIndexSearchPage(resolved),
  });
}

export default async function SearchQueryPage({ params }: SearchPageProps) {
  const { query } = await params;
  const resolved = resolveSearchQuery(query, 0);

  if (!resolved.isValid) {
    notFound();
  }

  if (query.toLowerCase() !== resolved.canonicalSlug.toLowerCase()) {
    redirect(resolved.canonicalPath);
  }

  const phrase = resolved.phrase;

  return (
    <PageShell>
      <Suspense fallback={<SearchLandingShell phrase={phrase} />}>
        <SearchLandingDeferred query={query} phrase={phrase} />
      </Suspense>

      <SiteFooter />
    </PageShell>
  );
}
