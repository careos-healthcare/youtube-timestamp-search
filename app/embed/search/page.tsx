import Link from "next/link";

import { sanitizeSearchPhrase } from "@/lib/search-query-guard";
import { buildSearchPath, getSiteUrl } from "@/lib/seo";

type EmbedSearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function EmbedSearchPage({ searchParams }: EmbedSearchPageProps) {
  const { q } = await searchParams;
  const phrase = sanitizeSearchPhrase(q ?? "javascript");

  return (
    <main className="p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-blue-300">YouTube Time Search</p>
        <h1 className="mt-2 text-lg font-semibold text-white">Search inside video for &quot;{phrase}&quot;</h1>
        <p className="mt-2 text-sm text-slate-300">
          Find exact useful moments inside long-form YouTube videos.
        </p>
        <Link
          href={`${getSiteUrl()}${buildSearchPath(phrase)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm text-blue-100"
        >
          Open full search results
        </Link>
      </div>
    </main>
  );
}
