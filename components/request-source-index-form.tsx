"use client";

import { useState } from "react";

import { trackPersistentEvent } from "@/lib/analytics";

const SOURCE_TYPES = ["video", "channel", "playlist", "podcast"] as const;

export type SourceIndexRequestSurface =
  | "empty_search_recovery"
  | "search_transcript_error"
  | "search_transcript_timeout"
  | "moments_index"
  | "trending"
  | "video_transcript_error";

export function RequestSourceIndexForm(props: { surface: SourceIndexRequestSurface }) {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [sourceType, setSourceType] = useState<(typeof SOURCE_TYPES)[number]>("video");
  const [sent, setSent] = useState<"idle" | "ok" | "err">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setSent("err");
      return;
    }
    void trackPersistentEvent("source_index_request", {
      requestedUrl: trimmed,
      topic: topic.trim() || undefined,
      sourceType,
      surface: props.surface,
      hasEmail: email.trim() ? "1" : "0",
    });
    void fetch("/api/corpus/request-index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedUrl: trimmed,
        topic: topic.trim() || undefined,
        sourceType,
        surface: props.surface,
      }),
    }).catch(() => {});
    setSent("ok");
    setUrl("");
    setTopic("");
    setEmail("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white">Request a new source for indexing</h3>
      <p className="mt-1 text-xs text-slate-400">
        Heuristic intake only — no account. Paste a public YouTube video, channel, playlist, or podcast URL you want
        searchable in a future crawl.
      </p>
      {sent === "ok" ? (
        <p className="mt-3 text-sm text-emerald-200">Thanks — request logged. No guarantee of timing.</p>
      ) : null}
      {sent === "err" ? <p className="mt-3 text-sm text-rose-300">Add a valid YouTube URL.</p> : null}
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <label className="block text-xs text-slate-400">
          YouTube URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=… or channel URL"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Optional topic / notes
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Kubernetes scheduling"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Source type
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as (typeof SOURCE_TYPES)[number])}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Optional email (for follow-up only if you choose to share it)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-500/25"
        >
          Submit request
        </button>
      </form>
    </div>
  );
}
