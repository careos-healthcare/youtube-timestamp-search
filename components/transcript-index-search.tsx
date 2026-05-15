"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";

import { EmptySearchRecoveryTracker } from "@/components/empty-search-recovery-tracker";
import { trackEvent } from "@/lib/analytics";
import { NOT_INDEXED_EMPTY_STATE } from "@/lib/empty-state-copy";
import { buildMomentPath, buildSearchPath, buildTranscriptsIndexPath, buildVideoPath } from "@/lib/seo";

type IndexedMatch = {
  videoId: string;
  title?: string;
  channelName?: string;
  score: number;
  matches: Array<{
    start: number;
    timestamp: string;
    snippet: string;
    text: string;
  }>;
};

type SearchIndexResponse = {
  error?: string;
  results?: IndexedMatch[];
  query?: string;
  appliedQuery?: string;
  recoveryPath?: string | null;
  suggestedSearches?: string[];
  trendingAlternatives?: string[];
};

export function TranscriptIndexSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<IndexedMatch[]>([]);
  const [meta, setMeta] = useState<{
    appliedQuery?: string;
    recoveryPath?: string | null;
    suggested: string[];
    trending: string[];
  }>({ suggested: [], trending: [] });

  const runSearch = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");
    trackEvent("indexed_transcript_search", { queryLength: trimmed.length });

    try {
      const response = await fetch(`/api/search-index?query=${encodeURIComponent(trimmed)}`);
      const data = (await response.json()) as SearchIndexResponse;

      if (!response.ok) {
        setError(data.error ?? "Indexed search failed.");
        setResults([]);
        setMeta({ suggested: [], trending: [] });
        return;
      }

      setResults(data.results ?? []);
      setMeta({
        appliedQuery: data.appliedQuery,
        recoveryPath: data.recoveryPath ?? null,
        suggested: data.suggestedSearches ?? [],
        trending: data.trendingAlternatives ?? [],
      });

      if ((data.results ?? []).length === 0) {
        trackEvent("no_results", { queryLength: trimmed.length, surface: "index" });
      }
    } catch {
      setError("Indexed search failed.");
      setResults([]);
      setMeta({ suggested: [], trending: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  const trimmed = query.trim();
  const showEmpty = !isLoading && trimmed.length > 0 && results.length === 0 && !error;
  const alternativesShown =
    showEmpty && (meta.suggested.length > 0 || meta.trending.length > 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Search cached transcripts</h2>
          <p className="mt-1 text-sm text-slate-300">
            Search across indexed transcripts that were cached after prior lookups.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search indexed transcripts"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none ring-blue-400/30 placeholder:text-slate-500 focus:ring-2"
          />
          <button
            type="submit"
            disabled={isLoading || query.trim().length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/15 px-5 text-sm font-medium text-blue-100 disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Search index"}
          </button>
        </form>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {results.length > 0 &&
        meta.appliedQuery &&
        meta.appliedQuery.toLowerCase() !== trimmed.toLowerCase() ? (
          <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
            Showing index matches for &quot;{meta.appliedQuery}&quot; (expanded from your query).
          </p>
        ) : null}

        {showEmpty ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
            {alternativesShown ? <EmptySearchRecoveryTracker phrase={trimmed} /> : null}
            <p className="font-medium text-white">No exact match yet</p>
            <p className="mt-2">{NOT_INDEXED_EMPTY_STATE}</p>
            {meta.suggested.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try next</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta.suggested.slice(0, 12).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setQuery(p);
                        void runSearch(p);
                      }}
                      className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {meta.trending.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trending alternatives</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta.trending.map((p) => (
                    <Link
                      key={p}
                      href={buildSearchPath(p)}
                      className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                Paste a YouTube URL
              </Link>
              <Link href={buildTranscriptsIndexPath()} className="text-blue-200 hover:text-blue-100">
                Browse index
              </Link>
              <Link href="/trending" className="text-blue-200 hover:text-blue-100">
                Trending
              </Link>
            </div>
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((result) => (
              <article
                key={result.videoId}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {result.title ?? result.videoId}
                    </h3>
                    {result.channelName ? (
                      <p className="text-xs text-slate-400">{result.channelName}</p>
                    ) : null}
                  </div>
                  <Link
                    href={buildVideoPath(result.videoId)}
                    className="text-sm text-blue-200 hover:text-blue-100"
                  >
                    Open transcript page
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {result.matches.map((match) => (
                    <li key={`${result.videoId}-${match.start}-${match.text.slice(0, 20)}`}>
                      <p className="text-xs font-medium text-emerald-200">{match.timestamp}</p>
                      <p className="text-sm leading-6 text-slate-300">{match.snippet}</p>
                      <Link
                        href={buildMomentPath(result.videoId, match.text)}
                        className="text-xs text-blue-200 hover:text-blue-100"
                      >
                        Jump to moment
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
