import Link from "next/link";

import { ShareActions } from "@/components/share-actions";
import { renderHighlightedText } from "@/lib/highlight";
import type { SearchResult } from "@/lib/transcript-types";
import { buildMomentUrl } from "@/lib/seo";

type TranscriptResultsProps = {
  results: SearchResult[];
  searchedPhrase: string;
  videoId: string;
  shareUrl: string;
};

export function TranscriptResults({
  results,
  searchedPhrase,
  videoId,
  shareUrl,
}: TranscriptResultsProps) {
  if (results.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        No matching moment found for &quot;{searchedPhrase}&quot; in video {videoId}.
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>
          {results.length} matching moment{results.length === 1 ? "" : "s"} found for &quot;
          {searchedPhrase}&quot;.
        </p>
        <div className="mt-3">
          <ShareActions shareUrl={shareUrl} />
        </div>
      </div>

      {results.map((result) => (
        <article
          key={`${result.start}-${result.timestamp}`}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-200">
                {result.timestamp}
              </div>
              <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                {renderHighlightedText(result.snippet, result.highlightTerms)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={result.openUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium whitespace-nowrap text-blue-100 transition hover:bg-blue-400/20"
              >
                Open at this moment
              </a>
              <Link
                href={result.pageUrl}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 hover:bg-white/10"
              >
                View indexed result
              </Link>
              <ShareActions
                shareUrl={buildMomentUrl(videoId, searchedPhrase)}
                label="Share result"
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
