import type { Metadata } from "next";
import Link from "next/link";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { RelatedSearches } from "@/components/related-searches";
import { SearchForm } from "@/components/search-form";
import { buildSearchPath, createSearchMetadata, deslugifyQuery } from "@/lib/seo";

type SearchPageProps = {
  params: Promise<{ query: string }>;
};

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { query } = await params;
  return createSearchMetadata(deslugifyQuery(query));
}

const SUGGESTED_VIDEO_EXAMPLES = [
  { label: "JavaScript tutorial", videoId: "PkZNo7MFNFg", query: "javascript" },
  { label: "Focus podcast", videoId: "hFL6qRIJZ_Y", query: "focus" },
  { label: "Startup talk", videoId: "MT4Ig2uqjTc", query: "users" },
];

export default async function SearchQueryPage({ params }: SearchPageProps) {
  const { query } = await params;
  const phrase = deslugifyQuery(query);

  return (
    <PageShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Search YouTube transcripts for &quot;{phrase}&quot;
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Find exact YouTube transcript timestamps for &quot;{phrase}&quot; in podcasts,
              interviews, lectures, and tutorials. Paste a video link below to jump to the exact
              moment without scrubbing.
            </p>
          </div>

          <SearchForm initialPhrase={phrase} />

          <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Try these indexed examples</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_VIDEO_EXAMPLES.map((example) => (
                <Link
                  key={example.videoId}
                  href={`/video/${example.videoId}/moment/${encodeURIComponent(example.query)}`}
                  className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-sm text-slate-200 hover:bg-white/10"
                >
                  {example.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <RelatedSearches
        keywords={["dopamine", "discipline", "pricing", "startup", "focus", "sleep", "javascript"]}
        currentQuery={phrase}
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>
          Looking for more ways to search? Try{" "}
          <Link href={buildSearchPath("podcast")} className="text-blue-200 hover:text-blue-100">
            podcast transcript search
          </Link>
          ,{" "}
          <Link href="/find-youtube-quotes" className="text-blue-200 hover:text-blue-100">
            find YouTube quotes
          </Link>
          , or{" "}
          <Link href="/find-youtube-timestamps" className="text-blue-200 hover:text-blue-100">
            find YouTube timestamps
          </Link>
          .
        </p>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
