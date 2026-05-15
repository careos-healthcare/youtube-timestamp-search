import Link from "next/link";

import { EmptySearchRecoveryTracker } from "@/components/empty-search-recovery-tracker";
import { getRelatedSearchPhrases } from "@/lib/internal-linking";
import { buildLatestPath, buildSearchPath, buildTranscriptsIndexPath } from "@/lib/seo";

type SearchEmptyRecoveryProps = {
  phrase: string;
  explorePhrases: string[];
  peopleAlsoSearched: Array<{ phrase: string; href: string }>;
};

export function SearchEmptyRecovery({ phrase, explorePhrases, peopleAlsoSearched }: SearchEmptyRecoveryProps) {
  const closest = [...new Set([...explorePhrases, ...getRelatedSearchPhrases(phrase, 12)])].filter(
    (p) => p.toLowerCase() !== phrase.toLowerCase()
  );

  return (
    <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 sm:p-6">
      <EmptySearchRecoveryTracker phrase={phrase} />
      <h2 className="text-lg font-semibold text-white">No exact match yet</h2>
      <p className="mt-2 text-sm leading-7 text-amber-50/90">
        The public transcript index changes as new long-form videos are added. Try a nearby phrase or open a
        single video and search its transcript immediately.
      </p>

      {closest.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-100/80">Closest matches</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {closest.slice(0, 14).map((p) => (
              <Link
                key={p}
                href={buildSearchPath(p)}
                className="inline-flex h-8 items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs text-slate-100 hover:bg-white/10"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {peopleAlsoSearched.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-100/80">Related searches</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {peopleAlsoSearched.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="inline-flex h-8 items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs text-slate-100 hover:bg-white/10"
              >
                {p.phrase}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
        <Link href="/" className="text-blue-100 underline-offset-4 hover:text-white">
          Paste a YouTube URL
        </Link>
        <Link href={buildTranscriptsIndexPath()} className="text-blue-100 underline-offset-4 hover:text-white">
          Browse indexed videos
        </Link>
        <Link href={buildLatestPath()} className="text-blue-100 underline-offset-4 hover:text-white">
          Newest indexed uploads
        </Link>
        <Link href="/trending" className="text-blue-100 underline-offset-4 hover:text-white">
          Trending discovery
        </Link>
      </div>

      <p className="mt-4 text-xs text-amber-100/70">
        Missing a creator or lecture series? Use the Chrome extension request flow from a watch page so the next
        crawl can pick it up (no rehosting — transcript links only).
      </p>
    </section>
  );
}
