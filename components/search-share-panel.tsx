"use client";

import { useState } from "react";

import { ClipBriefPanel } from "@/components/clip-brief-panel";
import { CopyableLink } from "@/components/copyable-link";
import type { SearchLandingData } from "@/lib/search-landing-engine";
import { buildContextSentence } from "@/lib/clip-distribution";
import {
  buildAnswerOgImageUrl,
  buildEmbedAnswerUrl,
  buildEmbedMomentUrl,
  buildEmbedSearchUrl,
  buildMomentOgImageUrl,
  buildSearchOgImageUrl,
  buildTrackedSearchPageUrl,
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

export function SearchSharePanel({ phrase, canonicalUrl, landing }: SearchSharePanelProps) {
  const [shared, setShared] = useState(false);
  const trackedUrl = buildTrackedSearchPageUrl(phrase, "copy", "copy");
  const plainSummary = buildPlainTextSummary(phrase, landing, trackedUrl);
  const embedSearch = buildEmbedSearchUrl(phrase);
  const embedAnswer = buildEmbedAnswerUrl(phrase);
  const topMoment = landing.moments[0];
  const embedMoment = topMoment
    ? buildEmbedMomentUrl(topMoment.videoId, phrase, {
        timestamp: topMoment.timestamp,
        snippet: topMoment.snippet,
        channelName: topMoment.channelName,
      })
    : null;

  const searchBrief = {
    kind: "search" as const,
    title: phrase,
    quote: topMoment?.snippet ?? `Indexed transcript moments for "${phrase}".`,
    timestampUrl: topMoment?.youtubeUrl ?? trackedUrl,
    pageUrl: canonicalUrl,
    videoTitle: topMoment?.videoTitle,
    channelName: topMoment?.channelName,
    timestampLabel: topMoment?.timestamp,
    videoId: topMoment?.videoId,
  };

  async function handleNativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Search inside video for "${phrase}"`,
        text: plainSummary,
        url: trackedUrl,
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
            Share cards, clip briefs, embed widgets, and tracked links for forums and social posts.
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

      <CopyableLink label="Search share card image" value={buildSearchOgImageUrl(phrase)} />
      {landing.answer.mode === "answer" && landing.answer.answerSnippet ? (
        <CopyableLink label="Answer share card image" value={buildAnswerOgImageUrl(phrase)} />
      ) : null}
      {topMoment ? (
        <CopyableLink
          label="Top moment share card image"
          value={buildMomentOgImageUrl(topMoment.videoId, {
            query: phrase,
            timestamp: topMoment.timestamp,
            snippet: topMoment.snippet,
          })}
        />
      ) : null}

      <ClipBriefPanel brief={searchBrief} ogImageUrl={buildSearchOgImageUrl(phrase)} />

      <CopyableLink label="Tracked canonical link" value={trackedUrl} />
      <CopyableLink label="Plain text summary (Reddit / forums)" value={plainSummary} />
      <CopyableLink
        label="Embed search widget"
        value={`<iframe src="${embedSearch}" width="100%" height="200" style="border:0;border-radius:12px" loading="lazy" title="Search transcript moments"></iframe>`}
      />
      <CopyableLink
        label="Embed answer widget"
        value={`<iframe src="${embedAnswer}" width="100%" height="240" style="border:0;border-radius:12px" loading="lazy" title="Transcript answer card"></iframe>`}
      />
      {embedMoment ? (
        <CopyableLink
          label="Embed moment card"
          value={`<iframe src="${embedMoment}" width="100%" height="260" style="border:0;border-radius:12px" loading="lazy" title="Timestamped transcript moment"></iframe>`}
        />
      ) : null}

      {landing.answer.mode === "answer" &&
      landing.answer.answerSnippet &&
      landing.answer.sourceMoment &&
      landing.answer.jumpUrl ? (
        <ClipBriefPanel
          brief={{
            kind: "answer",
            title: phrase,
            quote: landing.answer.answerSnippet,
            timestampUrl: landing.answer.jumpUrl,
            pageUrl: canonicalUrl,
            videoId: landing.answer.sourceMoment.videoId,
            videoTitle: landing.answer.sourceMoment.videoTitle,
            channelName: landing.answer.sourceMoment.channelName,
            timestampLabel: landing.answer.sourceMoment.timestamp,
            contextSentence: buildContextSentence({
              kind: "answer",
              title: phrase,
              quote: landing.answer.answerSnippet,
              timestampUrl: landing.answer.jumpUrl,
              pageUrl: canonicalUrl,
              videoTitle: landing.answer.sourceMoment.videoTitle,
              timestampLabel: landing.answer.sourceMoment.timestamp,
            }),
          }}
          ogImageUrl={buildAnswerOgImageUrl(phrase)}
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
