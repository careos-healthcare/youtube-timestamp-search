import Link from "next/link";

import { NOT_INDEXED_EMPTY_STATE } from "@/lib/empty-state-copy";
import { PRODUCT_WEDGE } from "@/lib/product-copy";
import { getRelatedSearchPhrases } from "@/lib/internal-linking";
import { buildSearchPath } from "@/lib/seo";

type SearchLandingThinContentProps = {
  phrase: string;
  momentCount: number;
};

export function SearchLandingThinContent({ phrase, momentCount }: SearchLandingThinContentProps) {
  const relatedTopics = getRelatedSearchPhrases(phrase, 10);

  return (
    <section className="grid gap-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-white">
          {momentCount === 0 ? "Building coverage for this query" : "Limited indexed coverage"}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          {momentCount === 0 ? (
            <>
              {NOT_INDEXED_EMPTY_STATE} {PRODUCT_WEDGE} This page will list timestamped moments as
              more long-form videos mentioning &quot;{phrase}&quot; enter the public index.
            </>
          ) : (
            <>
              Only {momentCount} indexed moment{momentCount === 1 ? "" : "s"} matched &quot;{phrase}
              &quot; so far. {PRODUCT_WEDGE} Paste any YouTube URL with captions to search inside it
              immediately — results are not fabricated.
            </>
          )}
        </p>
      </div>

      {relatedTopics.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Related searchable topics</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedTopics.map((topic) => (
              <Link
                key={topic}
                href={buildSearchPath(topic)}
                className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-200 hover:bg-white/10"
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
        <p className="text-sm text-slate-200">
          Have a specific long video in mind? Paste its YouTube URL on the homepage to search inside
          the transcript and jump to exact moments about &quot;{phrase}&quot;.
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm font-medium text-blue-100"
        >
          Paste a YouTube URL
        </Link>
      </div>
    </section>
  );
}
