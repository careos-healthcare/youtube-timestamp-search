"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import { slugifyQuery } from "@/lib/seo";

type VideoWithinSearchFormProps = {
  videoId: string;
  videoTitle?: string;
  initialPhrase?: string;
};

export function VideoWithinSearchForm({
  videoId,
  videoTitle,
  initialPhrase = "",
}: VideoWithinSearchFormProps) {
  const router = useRouter();
  const [phrase, setPhrase] = useState(initialPhrase);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const phraseInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPhrase = phrase.trim();
    if (!trimmedPhrase || isLoading) return;

    setIsLoading(true);
    setError("");

    trackEvent("video_within_search_submitted", {
      videoId,
      phraseLength: trimmedPhrase.length,
    });

    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Transcript unavailable for this video.");
      }

      router.push(`/video/${videoId}/moment/${slugifyQuery(trimmedPhrase)}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Search failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handlePhraseKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 sm:p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-white">Search within this video</h2>
        <p className="mt-1 text-sm text-slate-300">
          {videoTitle
            ? `Find exact timestamps inside "${videoTitle}" without scrubbing.`
            : "Find exact timestamps inside this transcript without scrubbing."}
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`search-within-${videoId}`} className="text-sm font-medium text-slate-200">
          Search phrase
        </label>
        <input
          ref={phraseInputRef}
          id={`search-within-${videoId}`}
          type="text"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          onKeyDown={handlePhraseKeyDown}
          placeholder="Topic, quote, or keyword"
          className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
          autoComplete="off"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || phrase.trim().length === 0}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Searching transcript..." : "Search this video"}
      </button>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
