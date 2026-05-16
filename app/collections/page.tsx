import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { STATIC_PUBLIC_COLLECTIONS } from "@/lib/collections/static-collections";
import { createCollectionsIndexMetadata, buildCollectionPath } from "@/lib/seo";

export const metadata: Metadata = createCollectionsIndexMetadata();

export default function CollectionsIndexPage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Research collections</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Static, transcript-backed reading lists — each item opens a canonical moment page with citations. Labels are
          heuristic source context, not endorsements.
        </p>
        <ul className="mt-8 space-y-3">
          {STATIC_PUBLIC_COLLECTIONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={buildCollectionPath(c.slug)}
                className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-emerald-400/30"
              >
                <p className="text-base font-semibold text-white">{c.title}</p>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">{c.intro}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </PageShell>
  );
}
