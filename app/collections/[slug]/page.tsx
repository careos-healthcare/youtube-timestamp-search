import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionMomentCard } from "@/components/collection-moment-card";
import { CollectionPageViewBeacon } from "@/components/collection-page-view-beacon";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { getStaticCollectionBySlug, listCollectionSlugs, resolveCollectionMoments } from "@/lib/collections/static-collections";
import { getSiteUrl, buildCollectionPath, buildPublicMomentPath, buildSearchPath, buildTopicPath, createCollectionPageMetadata } from "@/lib/seo";
import { formatTopicLabel } from "@/lib/topic-keywords";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listCollectionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const c = getStaticCollectionBySlug(slug);
  if (!c) return { title: "Collection" };
  return createCollectionPageMetadata({
    slug: c.slug,
    title: c.title,
    description: c.intro,
  });
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const collection = getStaticCollectionBySlug(slug);
  if (!collection) {
    notFound();
  }

  const moments = resolveCollectionMoments(collection);
  const canonicalUrl = `${getSiteUrl()}${buildCollectionPath(collection.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: collection.title,
    description: collection.intro,
    url: canonicalUrl,
    numberOfItems: moments.length,
    itemListElement: moments.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.phrase,
      url: `${getSiteUrl()}${buildPublicMomentPath(m.id, m.canonicalSlug)}`,
    })),
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CollectionPageViewBeacon slug={collection.slug} momentCount={moments.length} />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90">Static collection</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{collection.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{collection.intro}</p>
        <p className="mt-2 text-xs text-slate-500">
          {moments.length} moment{moments.length === 1 ? "" : "s"} resolved from the public index for this page.
        </p>
      </section>

      {moments.length === 0 ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-50">
          Moments for this collection are not available in the current materialized index build.
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Best moments in this bundle</h2>
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {moments.map((m) => (
              <CollectionMomentCard key={m.id} collectionSlug={collection.slug} moment={m} queryLabel={collection.title} />
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {collection.relatedTopicSlugs.map((t) => (
              <Link
                key={t}
                href={buildTopicPath(t)}
                className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100 hover:border-emerald-300/40"
              >
                {formatTopicLabel(t)}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related searches</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {collection.relatedSearches.map((q) => (
              <Link
                key={q}
                href={buildSearchPath(q)}
                className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100 hover:border-blue-300/40"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
