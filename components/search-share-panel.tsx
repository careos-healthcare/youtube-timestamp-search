"use client";

import { useState } from "react";

import { CopyableLink } from "@/components/copyable-link";
import type { SearchLandingData } from "@/lib/search-landing-engine";
import {
  buildEmbedMomentUrl,
  buildEmbedSearchUrl,
} from "@/lib/og-urls";

type SearchSharePanelProps = {
  phrase: string;
  canonicalUrl: string;
  landing: SearchLandingData;
};

function buildPlainTextSummary(phrase: string, landing: SearchLandingData, canonicalUrl: string) {
  const lines = [
    `Search inside video for "${phrase}"`,
    `${landing.moments.length} indexed moments across ${landing.videoCount} videos`,
    canonicalUrl,
  ];

  for (const moment of landing.moments.slice(0, 5)) {
    lines.push(`- ${moment.timestamp} ${moment.videoTitle}: ${moment.youtubeUrl}`);
  }

  return lines.join("\n");
}

function buildRedditTitle(phrase: string, landing: SearchLandingData) {
  return `[Searchable moments] "${phrase}" across ${landing.videoCount} indexed long-form videos`;
}

function buildHackerNewsTitle(phrase: string) {
  return `Search inside video for "${phrase}" — timestamped transcript moments`;
}

export function SearchSharePanel({ phrase, canonicalUrl, landing }: SearchSharePanelProps) {
  const [shared, setShared] = useState(false);
  const plainSummary = buildPlainTextSummary(phrase, landing, canonicalUrl);
  const embedSearch = buildEmbedSearchUrl(phrase);
  const topMoment = landing.moments[0];
  const embedMoment = topMoment
    ? buildEmbedMomentUrl(topMoment.videoId, phrase, topMoment.timestamp)
    : null;

  async function handleNativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: buildHackerNewsTitle(phrase),
        text: plainSummary,
        url: canonicalUrl,
      });
      setShared(true);
    } catch {
      // user cancelled
    }
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Share this search</h2>
          <p className="mt-1 text-sm text-slate-300">
            Copy timestamp links, plain-text summaries, or embed widgets for blogs and forums.
          </p>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm font-medium text-blue-100"
          >
            {shared ? "Shared" : "Share"}
          </button>
        ) : null}
      </div>

      <CopyableLink label="Canonical link" value={canonicalUrl} />
      <CopyableLink label="Plain text summary (Reddit / forums)" value={plainSummary} />
      <CopyableLink label="Reddit post title" value={buildRedditTitle(phrase, landing)} monospace={false} />
      <CopyableLink label="Hacker News title" value={buildHackerNewsTitle(phrase)} monospace={false} />
      <CopyableLink label="Embed search widget" value={`<iframe src="${embedSearch}" width="100%" height="180" style="border:0;border-radius:12px" loading="lazy"></iframe>`} />
      {embedMoment ? (
        <CopyableLink
          label="Embed timestamp card"
          value={`<iframe src="${embedMoment}" width="100%" height="220" style="border:0;border-radius:12px" loading="lazy"></iframe>`}
        />
      ) : null}

      {landing.moments.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-white">Copyable timestamp links</h3>
          {landing.moments.slice(0, 6).map((moment) => (
            <CopyableLink
              key={`${moment.videoId}-${moment.startSeconds}`}
              label={`${moment.timestamp} · ${moment.videoTitle}`}
              value={moment.youtubeUrl}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
