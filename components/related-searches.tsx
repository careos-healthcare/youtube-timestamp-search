import Link from "next/link";

import { buildMomentPath, buildSearchPath } from "@/lib/seo";

type RelatedSearchesProps = {
  videoId?: string;
  keywords: string[];
  currentQuery?: string;
};

export function RelatedSearches({ videoId, keywords, currentQuery }: RelatedSearchesProps) {
  if (keywords.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">Related searches</h2>
        <p className="text-sm text-slate-300">
          Continue searching the transcript with related keywords and suggested moments.
        </p>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Link
              key={keyword}
              href={
                videoId
                  ? buildMomentPath(videoId, keyword)
                  : buildSearchPath(keyword)
              }
              className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200 hover:bg-white/10"
            >
              {keyword}
            </Link>
          ))}
        </div>
        {currentQuery && videoId && (
          <p className="text-sm text-slate-400">
            Keep exploring around &quot;{currentQuery}&quot; or try another phrase above.
          </p>
        )}
      </div>
    </section>
  );
}
