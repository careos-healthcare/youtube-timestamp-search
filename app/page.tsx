"use client";

import { FormEvent, KeyboardEvent, type ReactNode, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  extractYouTubeVideoId,
  formatTimestampFromMs,
  getYouTubeWatchUrl,
  normalizeText,
} from "@/lib/youtube";

type SearchResult = {
  start: number;
  timestamp: string;
  snippet: string;
  openUrl: string;
  highlightTerms: string[];
};

type UiError = {
  title: string;
  detail?: string;
};

type TranscriptLine = {
  text: string;
  start: number;
  duration: number;
};

const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=PkZNo7MFNFg";
const DEMO_SEARCH_PHRASE = "javascript";
const CLIENT_SUBMISSION_COOLDOWN_MS = 1200;
const MAX_RESULTS = 20;
const MAX_NEIGHBOR_LINES = 1;
const MAX_NEARBY_SECONDS = 10;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFallbackTerms(phrase: string) {
  return Array.from(
    new Set(
      normalizeText(phrase)
        .toLowerCase()
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

function buildMergedSnippet(transcript: TranscriptLine[], index: number) {
  let startIndex = index;
  let endIndex = index;

  while (
    startIndex > 0 &&
    index - startIndex < MAX_NEIGHBOR_LINES &&
    transcript[index].start - transcript[startIndex - 1].start <= MAX_NEARBY_SECONDS
  ) {
    startIndex -= 1;
  }

  while (
    endIndex < transcript.length - 1 &&
    endIndex - index < MAX_NEIGHBOR_LINES &&
    transcript[endIndex + 1].start - transcript[endIndex].start <= MAX_NEARBY_SECONDS
  ) {
    endIndex += 1;
  }

  return normalizeText(
    transcript
      .slice(startIndex, endIndex + 1)
      .map((entry) => entry.text)
      .join(" ")
  );
}

function formatTimestampFromSeconds(seconds: number) {
  return formatTimestampFromMs(seconds * 1000);
}

function findMatches(
  videoId: string,
  transcript: TranscriptLine[],
  phrase: string
): SearchResult[] {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const fallbackTerms = getFallbackTerms(phrase);

  const collectResults = (predicate: (snippetLower: string) => string[]) => {
    const matches: SearchResult[] = [];

    for (let index = 0; index < transcript.length; index += 1) {
      const snippet = buildMergedSnippet(transcript, index);
      const snippetLower = snippet.toLowerCase();
      const highlightTerms = predicate(snippetLower);

      if (highlightTerms.length === 0) {
        continue;
      }

      const start = Math.max(0, transcript[index]?.start ?? 0);
      const previousMatch = matches.at(-1);
      if (previousMatch && Math.abs(previousMatch.start - start) < 3) {
        continue;
      }

      matches.push({
        start,
        timestamp: formatTimestampFromSeconds(start),
        snippet,
        openUrl: getYouTubeWatchUrl(videoId, start),
        highlightTerms,
      });

      if (matches.length >= MAX_RESULTS) {
        break;
      }
    }

    return matches;
  };

  const exactPhraseMatches = collectResults((snippetLower) =>
    normalizedPhrase && snippetLower.includes(normalizedPhrase) ? [phrase] : []
  );

  if (exactPhraseMatches.length > 0) {
    return exactPhraseMatches;
  }

  return collectResults((snippetLower) => {
    const matchedTerms = fallbackTerms.filter((term) => snippetLower.includes(term));
    return matchedTerms;
  });
}

function renderHighlightedText(text: string, highlightTerms: string[]): ReactNode {
  const uniqueTerms = Array.from(
    new Set(
      highlightTerms
        .map((term) => normalizeText(term))
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
    )
  );

  if (uniqueTerms.length === 0) {
    return text;
  }

  const matcher = new RegExp(`(${uniqueTerms.map(escapeRegExp).join("|")})`, "ig");
  return text.split(matcher).map((part, index) => {
    const isMatch = uniqueTerms.some((term) => part.toLowerCase() === term.toLowerCase());
    if (!isMatch) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-yellow-300/20 px-1 text-yellow-100"
      >
        {part}
      </mark>
    );
  });
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [phrase, setPhrase] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<UiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedPhrase, setSearchedPhrase] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const phraseInputRef = useRef<HTMLInputElement>(null);
  const lastSubmissionRef = useRef<{ key: string; submittedAt: number } | null>(null);

  const hasSearched = Boolean(searchedPhrase);
  const showNoResults = hasSearched && results.length === 0 && !error && !isLoading;
  const hasResults = results.length > 0;
  const isSubmitDisabled = isLoading || url.trim().length === 0 || phrase.trim().length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const trimmedUrl = url.trim();
    const trimmedPhrase = phrase.trim();
    const submissionKey = `${trimmedUrl}::${trimmedPhrase.toLowerCase()}`;
    const now = Date.now();

    if (
      lastSubmissionRef.current &&
      lastSubmissionRef.current.key === submissionKey &&
      now - lastSubmissionRef.current.submittedAt < CLIENT_SUBMISSION_COOLDOWN_MS
    ) {
      return;
    }

    lastSubmissionRef.current = { key: submissionKey, submittedAt: now };
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSearchedPhrase("");

    trackEvent("searches", {
      phraseLength: trimmedPhrase.length,
      hasValidUrl: Boolean(extractYouTubeVideoId(trimmedUrl)),
    });

    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as {
        videoId?: string;
        transcript?: TranscriptLine[];
        error?: string;
      };

      if (!response.ok) {
        throw {
          title:
            response.status === 400
              ? data.error ?? "Invalid YouTube URL."
              : "Transcript unavailable for this video.",
        } satisfies UiError;
      }

      const videoId = data.videoId ?? extractYouTubeVideoId(trimmedUrl);
      if (!videoId) {
        throw {
          title: "Invalid YouTube URL.",
        } satisfies UiError;
      }

      const nextResults = findMatches(videoId, data.transcript ?? [], trimmedPhrase);
      const nextPhrase = trimmedPhrase;

      setResults(nextResults);
      setSearchedPhrase(nextPhrase);

      if (nextResults.length > 0) {
        trackEvent("successful_results", {
          resultCount: nextResults.length,
          phraseLength: nextPhrase.trim().length,
        });
      }
    } catch (submissionError) {
      const nextError =
        typeof submissionError === "object" &&
        submissionError !== null &&
        "title" in submissionError
          ? (submissionError as UiError)
          : {
              title: "Search failed.",
              detail: "Please try again.",
            };

      setResults([]);
      setSearchedPhrase("");
      setError(nextError);

      if (nextError.title === "Transcript unavailable for this video.") {
        trackEvent("transcript_failures", {
          hasValidUrl: Boolean(extractYouTubeVideoId(trimmedUrl)),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function focusPhraseIfVideoUrlLooksValid(nextUrl: string) {
    if (!extractYouTubeVideoId(nextUrl)) {
      return;
    }

    window.requestAnimationFrame(() => {
      phraseInputRef.current?.focus();
      phraseInputRef.current?.select();
    });
  }

  function handleUrlPaste() {
    window.setTimeout(() => {
      const pastedUrl = urlInputRef.current?.value ?? "";
      focusPhraseIfVideoUrlLooksValid(pastedUrl);
    }, 0);
  }

  function handlePhraseKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  function handleExampleChipClick(example: string) {
    setPhrase(example);
    setError(null);
    window.requestAnimationFrame(() => {
      phraseInputRef.current?.focus();
      phraseInputRef.current?.select();
    });
  }

  function handleDemoVideoClick() {
    setUrl(DEMO_VIDEO_URL);
    setPhrase(DEMO_SEARCH_PHRASE);
    setError(null);
    setResults([]);
    setSearchedPhrase("");
    window.requestAnimationFrame(() => {
      phraseInputRef.current?.focus();
      phraseInputRef.current?.select();
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#0b1120_0%,_#020617_45%,_#020617_100%)] px-4 py-6 text-slate-50 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
                YouTube transcript utility
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Find the moment without scrubbing.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8">
                Paste a YouTube video link, search the transcript, and jump straight to the right timestamp.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleExampleChipClick("dopamine")}
                  className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-left text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Try: dopamine, discipline, pricing, startup
                </button>
              </div>
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:gap-4 sm:p-5"
            >
              <div className="grid gap-2">
                <label htmlFor="youtube-url" className="text-sm font-medium text-slate-200">
                  YouTube URL
                </label>
                <input
                  ref={urlInputRef}
                  id="youtube-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onPaste={handleUrlPaste}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="search-phrase" className="text-sm font-medium text-slate-200">
                  Search phrase
                </label>
                <input
                  ref={phraseInputRef}
                  id="search-phrase"
                  type="text"
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  onKeyDown={handlePhraseKeyDown}
                  placeholder="Search for a moment, topic, or keyword"
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Need something quick?</span>
                <button
                  type="button"
                  onClick={handleDemoVideoClick}
                  className="font-medium text-blue-200 underline decoration-blue-300/50 underline-offset-4 hover:text-blue-100"
                >
                  Try a demo video
                </button>
              </div>

              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl bg-slate-950/85 p-1 backdrop-blur sm:static sm:bg-transparent sm:p-0">
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Search transcript
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid min-h-[18rem] gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {error && (
              <>
                <span className="block font-medium text-slate-100">{error.title}</span>
                {error.detail && <span className="block pt-1 text-slate-400">{error.detail}</span>}
              </>
            )}
            {!error && !isLoading && !hasSearched && "Paste a video link and search for an exact phrase in the transcript."}
            {!error && !isLoading && hasResults && (
              <>
                {results.length} matching moment{results.length === 1 ? "" : "s"} found for &quot;
                {searchedPhrase}
                &quot;.
              </>
            )}
            {!error && showNoResults && (
              <>
                No matching moment found.
              </>
            )}
            {isLoading && "Searching the transcript..."}
          </div>

          {hasResults && !isLoading && (
            <div className="grid gap-4">
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

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <a
                        href={result.openUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          trackEvent("result_clicks", {
                            timestampSeconds: result.start,
                          })
                        }
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium whitespace-nowrap text-blue-100 transition hover:bg-blue-400/20 sm:w-auto"
                      >
                        Open at this moment
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              Search long podcasts
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              Jump to exact timestamps
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              No sign-up needed
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-2 text-xs text-slate-400 sm:pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
            <span>We do not store searches.</span>
            <span>Not affiliated with YouTube.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
