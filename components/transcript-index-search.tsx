"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { trackEvent } from "@/lib/analytics";
import { NOT_INDEXED_EMPTY_STATE } from "@/lib/empty-state-copy";
import { buildMomentPath, buildVideoPath } from "@/lib/seo";

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

export function TranscriptIndexSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<IndexedMatch[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");
    trackEvent("indexed_transcript_search", { queryLength: trimmed.length });

    try {
      const response = await fetch(`/api/search-index?query=${encodeURIComponent(trimmed)}`);
      const data = (await response.json()) as {
        error?: string;
        results?: IndexedMatch[];
      };

      if (!response.ok) {
        setError(data.error ?? "Indexed search failed.");
        setResults([]);
        return;
      }

      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        trackEvent("no_results", { queryLength: trimmed.length, surface: "index" });
      }
    } catch {
      setError("Indexed search failed.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Search cached transcripts</h2>
          <p className="mt-1 text-sm text-slate-300">
            Search across indexed transcripts that were cached after prior lookups.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
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

        {!isLoading && query.trim().length > 0 && results.length === 0 && !error ? (
          <p className="text-sm text-slate-300">{NOT_INDEXED_EMPTY_STATE}</p>
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
