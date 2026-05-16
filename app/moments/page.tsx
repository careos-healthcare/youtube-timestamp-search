import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { RequestSourceIndexForm } from "@/components/request-source-index-form";
import { SourceAuthorityBadge } from "@/components/source-authority-badge";
import {
  getTranscriptCategoryBySlug,
  TRANSCRIPT_CATEGORY_SLUGS,
  type TranscriptCategorySlug,
} from "@/lib/category-data";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { evaluatePublicMoment, momentQualityRankingKey } from "@/lib/quality";
import { evaluateSourceAuthorityForPublicMoment } from "@/lib/research/source-authority";
import { buildCategoryPath, buildPublicMomentPath, buildCollectionsIndexPath, createMomentsIndexMetadata } from "@/lib/seo";
import { buildMomentsDiscoveryStructuredData } from "@/lib/site-structured-data";

export const revalidate = 3600;

export const metadata: Metadata = createMomentsIndexMetadata();

function isCategorySlug(value: string): value is TranscriptCategorySlug {
  return (TRANSCRIPT_CATEGORY_SLUGS as readonly string[]).includes(value);
}

function groupKeyForMoment(row: PublicMomentRecord) {
  return row.category ?? row.topic ?? "other";
}

function groupHeading(key: string) {
  if (key === "other") return "More indexed moments";
  if (isCategorySlug(key)) {
    return getTranscriptCategoryBySlug(key)?.label ?? key;
  }
  return key;
}

export default function MomentsDiscoveryPage() {
  const moments = loadPublicMoments();
  const structuredData = buildMomentsDiscoveryStructuredData(moments.length);

  const groups = new Map<string, PublicMomentRecord[]>();
  for (const m of moments) {
    const key = groupKeyForMoment(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "other") return 1;
    if (b === "other") return -1;
    return groupHeading(a).localeCompare(groupHeading(b));
  });

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-violet-200/90">Discovery</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Best searchable video moments</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Curated, transcript-backed clips from the public index. Each card opens a canonical moment page with
            timestamp, excerpt, and YouTube link — no rehosting.
          </p>
          <p className="text-xs text-slate-500">
            {moments.length} moment{moments.length === 1 ? "" : "s"} · Updated when the materialized list is
            regenerated.
          </p>
        </div>
      </section>

      <div className="space-y-10">
        {orderedKeys.map((key) => {
          const rows = groups.get(key) ?? [];
          if (rows.length === 0) return null;
          const heading = groupHeading(key);
          const categoryHref = isCategorySlug(key) ? buildCategoryPath(key) : null;

          return (
            <section key={key} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-semibold text-white">{heading}</h2>
                {categoryHref ? (
                  <Link href={categoryHref} className="text-sm text-blue-200 hover:text-blue-100">
                    Browse {heading.toLowerCase()} category →
                  </Link>
                ) : null}
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {rows
                  .slice()
                  .sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a))
                  .map((m) => {
                    const ev = evaluatePublicMoment(m);
                    return (
                    <li key={m.id}>
                      <div className="block rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10">
                        <Link href={buildPublicMomentPath(m.id, m.canonicalSlug)} className="block">
                          <span className="font-medium text-white">&quot;{m.phrase}&quot;</span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {m.videoTitle ?? m.videoId} · {m.timestamp}
                          </span>
                        </Link>
                        <div className="mt-2 border-t border-white/5 pt-2">
                          <MomentQualitySignals
                            evaluation={ev}
                            momentId={m.id}
                            videoId={m.videoId}
                            phrase={m.phrase}
                            surface="moments_index"
                            compact
                          />
                          <div className="mt-2">
                            <SourceAuthorityBadge
                              authority={evaluateSourceAuthorityForPublicMoment(m)}
                              momentId={m.id}
                              videoId={m.videoId}
                              phrase={m.phrase}
                              surface="moments_index"
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                  })}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>
          Looking for more? Try the{" "}
          <Link href="/trending" className="text-blue-200 hover:text-blue-100">
            trending hub
          </Link>
          ,{" "}
          <Link href="/transcripts" className="text-blue-200 hover:text-blue-100">
            full transcript index
          </Link>
          ,{" "}
          <Link href={buildCollectionsIndexPath()} className="text-blue-200 hover:text-blue-100">
            research collections
          </Link>
          , or a{" "}
          <Link href="/search/what-is-rag" className="text-blue-200 hover:text-blue-100">
            seeded search landing
          </Link>
          .
        </p>
        <div className="mt-6">
          <RequestSourceIndexForm surface="moments_index" />
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
