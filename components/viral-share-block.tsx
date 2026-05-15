"use client";

import { useState } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import {
  buildLinkedInPostText,
  buildMarkdownCitation,
  buildQuotePlusTimestamp,
  buildRedditPostText,
  buildXPostText,
  type ViralShareContext,
} from "@/lib/growth/viral-share-text";
import { buildEmbedMomentUrl, buildQuoteOgImageUrl } from "@/lib/og-urls";

type ViralShareBlockProps = {
  context: ViralShareContext;
  compact?: boolean;
};

async function copyText(label: string, value: string, payload: Record<string, string | number | boolean | undefined>) {
  try {
    await navigator.clipboard.writeText(value);
    trackPersistentEvent("link_copy", { ...payload, label });
  } catch {
    // ignore
  }
}

export function ViralShareBlock({ context, compact = false }: ViralShareBlockProps) {
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  const quoteCardUrl = buildQuoteOgImageUrl(context.videoId, {
    q: context.query,
    t: context.timestampLabel,
    snippet: context.snippet,
  });
  const embed = buildEmbedMomentUrl(context.videoId, context.query, {
    timestamp: context.timestampLabel,
    snippet: context.snippet,
    channelName: context.channelName,
  });

  async function handleCopy(label: string, value: string) {
    await copyText(label, value, {
      query: context.query,
      videoId: context.videoId,
      surface: "viral_share_block",
    });
    setLastCopied(label);
    window.setTimeout(() => setLastCopied(null), 1600);
  }

  const gridClass = compact
    ? "grid gap-2 sm:grid-cols-2"
    : "grid gap-2 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-xs font-medium text-slate-400">Share formats</p>
      <div className={`mt-2 ${gridClass}`}>
        <button
          type="button"
          onClick={() => void handleCopy("quote_ts", buildQuotePlusTimestamp(context))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 hover:bg-white/10"
        >
          {lastCopied === "quote_ts" ? "Copied" : "Quote + timestamp"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("x", buildXPostText(context))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 hover:bg-white/10"
        >
          {lastCopied === "x" ? "Copied" : "X post"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("reddit", buildRedditPostText(context))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 hover:bg-white/10"
        >
          {lastCopied === "reddit" ? "Copied" : "Reddit post"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("linkedin", buildLinkedInPostText(context))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 hover:bg-white/10"
        >
          {lastCopied === "linkedin" ? "Copied" : "LinkedIn post"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("markdown", buildMarkdownCitation(context))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-100 hover:bg-white/10"
        >
          {lastCopied === "markdown" ? "Copied" : "Markdown citation"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("quote_card", quoteCardUrl)}
          className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-left text-xs text-violet-100 hover:bg-violet-500/15"
        >
          {lastCopied === "quote_card" ? "Copied" : "Quote card link"}
        </button>
        <button
          type="button"
          onClick={() =>
            void handleCopy(
              "embed",
              `<iframe src="${embed}" width="100%" height="280" style="border:0;border-radius:12px" loading="lazy" title="Timestamped transcript moment"></iframe>`
            )
          }
          className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-left text-xs text-blue-100 hover:bg-blue-500/15 sm:col-span-2 lg:col-span-1"
        >
          {lastCopied === "embed" ? "Copied" : "Copy embed"}
        </button>
      </div>
    </div>
  );
}
