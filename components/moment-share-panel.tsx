"use client";

import Link from "next/link";

import { ClipBriefPanel } from "@/components/clip-brief-panel";
import { CopyableLink } from "@/components/copyable-link";
import { buildContextSentence } from "@/lib/clip-distribution";
import {
  buildEmbedMomentUrl,
  buildMomentOgImageUrl,
  buildTrackedMomentPageUrl,
} from "@/lib/og-urls";

type MomentSharePanelProps = {
  videoId: string;
  phrase: string;
  videoTitle: string;
  channelName?: string;
  topResult?: {
    snippet: string;
    timestamp: string;
    youtubeUrl: string;
    startSeconds: number;
  };
};

export function MomentSharePanel({
  videoId,
  phrase,
  videoTitle,
  channelName,
  topResult,
}: MomentSharePanelProps) {
  if (!topResult) return null;

  const pageUrl = buildTrackedMomentPageUrl(videoId, phrase, "copy", "copy");
  const embedUrl = buildEmbedMomentUrl(videoId, phrase, {
    timestamp: topResult.timestamp,
    snippet: topResult.snippet,
    channelName,
  });

  return (
    <section className="grid gap-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-white">Share this moment</h2>
        <p className="mt-1 text-sm text-slate-300">
          Quote card, clip brief, and embed code — transcript and timestamp links only.
        </p>
      </div>

      <CopyableLink
        label="Moment share card image"
        value={buildMomentOgImageUrl(videoId, {
          query: phrase,
          timestamp: topResult.timestamp,
          snippet: topResult.snippet,
        })}
      />
      <CopyableLink label="Tracked moment page" value={pageUrl} />
      <CopyableLink
        label="Embed moment widget"
        value={`<iframe src="${embedUrl}" width="100%" height="280" style="border:0;border-radius:12px" loading="lazy" title="Timestamped transcript moment"></iframe>`}
      />

      <ClipBriefPanel
        brief={{
          kind: "moment",
          title: phrase,
          quote: topResult.snippet,
          timestampUrl: topResult.youtubeUrl,
          pageUrl,
          videoId,
          videoTitle,
          channelName,
          timestampLabel: topResult.timestamp,
          contextSentence: buildContextSentence({
            kind: "moment",
            title: phrase,
            quote: topResult.snippet,
            timestampUrl: topResult.youtubeUrl,
            pageUrl,
            videoTitle,
            timestampLabel: topResult.timestamp,
          }),
        }}
        ogImageUrl={buildMomentOgImageUrl(videoId, {
          query: phrase,
          timestamp: topResult.timestamp,
          snippet: topResult.snippet,
        })}
      />

      <Link href={pageUrl} className="text-sm text-blue-200 hover:text-blue-100">
        Open tracked moment page
      </Link>
    </section>
  );
}
