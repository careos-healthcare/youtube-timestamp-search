"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import { slugifyQuery } from "@/lib/seo";
import { extractYouTubeVideoId, getYouTubeWatchUrl } from "@/lib/youtube";

type SearchFormProps = {
  initialUrl?: string;
  initialPhrase?: string;
  initialVideoId?: string;
  compact?: boolean;
  source?: "homepage" | "moment" | "seo";
};

const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=PkZNo7MFNFg";
const DEMO_SEARCH_PHRASE = "javascript";
const CLIENT_SUBMISSION_COOLDOWN_MS = 1200;

export function SearchForm({
  initialUrl = "",
  initialPhrase = "",
  initialVideoId = "",
  compact = false,
  source = "seo",
}: SearchFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(
    initialUrl || (initialVideoId ? getYouTubeWatchUrl(initialVideoId) : "")
  );
  const [phrase, setPhrase] = useState(initialPhrase);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const phraseInputRef = useRef<HTMLInputElement>(null);
  const lastSubmissionRef = useRef<{ key: string; submittedAt: number } | null>(null);

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
    setError("");

    trackEvent("search_submitted", {
      phraseLength: trimmedPhrase.length,
      hasValidUrl: Boolean(extractYouTubeVideoId(trimmedUrl)),
      source,
    });

    if (source === "homepage") {
      trackEvent("homepage_search", {
        phraseLength: trimmedPhrase.length,
        hasValidUrl: Boolean(extractYouTubeVideoId(trimmedUrl)),
      });
    }

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
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? data.error ?? "Invalid YouTube URL."
            : "Transcript unavailable for this video."
        );
      }

      const videoId = data.videoId ?? extractYouTubeVideoId(trimmedUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube URL.");
      }

      trackEvent("transcript_load_success", {
        phraseLength: trimmedPhrase.length,
        source,
      });

      if (source === "homepage") {
        trackEvent("paste_url_submit", {
          videoId,
          phraseLength: trimmedPhrase.length,
        });
      }

      router.push(`/video/${videoId}/moment/${slugifyQuery(trimmedPhrase)}`);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Search failed. Please try again.";

      setError(message);
      trackEvent("transcript_load_failed", {
        hasValidUrl: Boolean(extractYouTubeVideoId(trimmedUrl)),
        reason: message,
      });
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

  return (
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
          placeholder="What moment are you looking for?"
          className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
          autoComplete="off"
          required
        />
      </div>

      {!compact && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Need something quick?</span>
          <button
            type="button"
            onClick={() => {
              setUrl(DEMO_VIDEO_URL);
              setPhrase(DEMO_SEARCH_PHRASE);
              setError("");
            }}
            className="font-medium text-blue-200 underline decoration-blue-300/50 underline-offset-4 hover:text-blue-100"
          >
            Try a demo video
          </button>
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl bg-slate-950/85 p-1 backdrop-blur sm:static sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Searching inside the video..." : "Search inside video"}
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}
