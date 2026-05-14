import Link from "next/link";

import { getSearchLandingData } from "@/lib/search-landing-engine";
import { sanitizeSearchPhrase } from "@/lib/search-query-guard";
import { appendShareUtm } from "@/lib/clip-distribution";
import { buildSearchPath, getSiteUrl } from "@/lib/seo";

type EmbedSearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function EmbedSearchPage({ searchParams }: EmbedSearchPageProps) {
  const { q } = await searchParams;
  const phrase = sanitizeSearchPhrase(q ?? "javascript");
  const landing = await getSearchLandingData(phrase, 4);
  const topMoment = landing.moments[0];
  const trackedSearch = appendShareUtm(`${getSiteUrl()}${buildSearchPath(phrase)}`, {
    source: "embed",
    medium: "embed",
    campaign: "search",
    content: phrase,
  });

  return (
    <main className="p-4">
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-blue-300">Search result card</p>
        <h1 className="mt-2 text-lg font-semibold text-white">Search inside video for &quot;{phrase}&quot;</h1>
        <p className="mt-2 text-sm text-slate-300">
          {landing.moments.length} indexed moment{landing.moments.length === 1 ? "" : "s"} across{" "}
          {landing.videoCount} video{landing.videoCount === 1 ? "" : "s"}.
        </p>
        {topMoment ? (
          <blockquote className="mt-3 border-l-2 border-blue-300/30 pl-3 text-sm leading-7 text-slate-100">
            &quot;{topMoment.snippet.slice(0, 180)}&quot;
            <span className="mt-1 block text-xs text-emerald-200">
              {topMoment.timestamp} · {topMoment.videoTitle}
            </span>
          </blockquote>
        ) : null}
        <Link
          href={trackedSearch}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm text-blue-100"
        >
          Open full search results
        </Link>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Transcript search only · links open on YouTube · no video rehosting
        </p>
      </div>
    </main>
  );
}
