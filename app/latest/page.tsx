import type { Metadata } from "next";
import Link from "next/link";

import { LatestVideosFeed } from "@/components/latest-videos-feed";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { getLatestIndexedVideos } from "@/lib/indexed-videos";
import {
  buildLatestPath,
  buildTranscriptsIndexPath,
  createLatestMetadata,
} from "@/lib/seo";
import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";

export const revalidate = 60;

const PAGE_SIZE = 12;

type LatestPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ searchParams }: LatestPageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam ?? 1), 1);
  return createLatestMetadata(page);
}

export default async function LatestPage({ searchParams }: LatestPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam ?? 1), 1);
  const offset = (page - 1) * PAGE_SIZE;
  const initialPage = await getLatestIndexedVideos(PAGE_SIZE, offset);
  const configured = isSupabaseTranscriptStoreConfigured();

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex w-fit rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
            Latest index
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Latest searchable videos
          </h1>
          <p className="text-sm leading-7 text-slate-200 sm:text-lg">
            Newest indexed YouTube transcripts from {configured ? "Supabase Postgres" : "temporary cache"},
            ordered by most recently fetched.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100"
            >
              Search a video
            </Link>
            <Link
              href={buildTranscriptsIndexPath()}
              className="inline-flex h-10 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100"
            >
              Transcript index
            </Link>
          </div>
        </div>
      </section>

      {!configured ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Transcript index is running in temporary cache mode. Add Supabase env vars for persistent latest
          videos across deployments.
        </section>
      ) : (
        <section className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          Showing {initialPage.total} indexed {initialPage.total === 1 ? "video" : "videos"} from persisted
          storage.
        </section>
      )}

      <LatestVideosFeed initialPage={initialPage} />

      {initialPage.total > PAGE_SIZE ? (
        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={buildLatestPath(page - 1)}
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-slate-200"
            >
              Previous page
            </Link>
          ) : null}
          <span className="text-slate-400">Page {page}</span>
          {initialPage.hasMore ? (
            <Link
              href={buildLatestPath(page + 1)}
              className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-slate-200"
            >
              Next page
            </Link>
          ) : null}
        </nav>
      ) : null}

      <SiteFooter />
    </PageShell>
  );
}
