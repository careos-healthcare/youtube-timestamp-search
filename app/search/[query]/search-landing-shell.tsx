import Link from "next/link";

import { SearchForm } from "@/components/search-form";
import { PRODUCT_WEDGE } from "@/lib/product-copy";
import { buildTranscriptsIndexPath } from "@/lib/seo";

export function SearchLandingShell({ phrase }: { phrase: string }) {
  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              Shareable search page
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-5xl">
              Exact video moments for &quot;{phrase}&quot;
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-lg">
              {PRODUCT_WEDGE} Loading timestamped matches from the index…
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

      <div className="mt-6 space-y-6 rounded-3xl border border-white/5 bg-white/5 p-6">
        <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-52 animate-pulse rounded-2xl bg-white/10" />
      </div>
    </>
  );
}
