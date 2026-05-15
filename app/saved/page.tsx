import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SavedClipsPageClient } from "@/components/saved-clips-page-client";
import { PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildSavedMomentsStructuredData } from "@/lib/site-structured-data";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Saved moments",
  description: `${PRODUCT_TAGLINE} Bookmarked transcript moments on this device.`,
  alternates: { canonical: `${getSiteUrl()}/saved` },
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  const structuredData = buildSavedMomentsStructuredData();

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Saved moments</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{PRODUCT_TAGLINE}</p>
        <div className="mt-8">
          <SavedClipsPageClient />
        </div>
      </section>
      <SiteFooter />
    </PageShell>
  );
}
