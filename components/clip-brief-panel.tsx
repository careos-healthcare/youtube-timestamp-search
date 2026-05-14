"use client";

import { CopyableLink } from "@/components/copyable-link";
import {
  appendShareUtm,
  buildClipBrief,
  buildContextSentence,
  buildSocialPostFormats,
  type ClipBriefInput,
} from "@/lib/clip-distribution";
import {
  buildAnswerOgImageUrl,
  buildMomentOgImageUrl,
  buildSearchOgImageUrl,
} from "@/lib/og-urls";

type ClipBriefPanelProps = {
  brief: ClipBriefInput;
  ogImageUrl?: string;
};

export function ClipBriefPanel({ brief, ogImageUrl }: ClipBriefPanelProps) {
  const contextSentence = brief.contextSentence ?? buildContextSentence(brief);
  const pageUrlWithUtm = appendShareUtm(brief.pageUrl, {
    source: "copy",
    medium: "copy",
    campaign: brief.kind,
    content: brief.title,
  });
  const fullBrief = buildClipBrief({ ...brief, contextSentence });
  const social = buildSocialPostFormats({ ...brief, contextSentence }, { pageUrlWithUtm });
  const cardUrl =
    ogImageUrl ??
    (brief.kind === "answer"
      ? buildAnswerOgImageUrl(brief.title)
      : brief.kind === "moment" && brief.videoId
        ? buildMomentOgImageUrl(brief.videoId, {
            query: brief.title,
            timestamp: brief.timestampLabel,
            snippet: brief.quote,
          })
        : buildSearchOgImageUrl(brief.title));

  return (
    <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Copy clip brief</h3>
        <p className="mt-1 text-xs leading-6 text-slate-400">
          Transcript text and timestamp links only. No video download or rehosting.
        </p>
      </div>

      <CopyableLink label="Clip brief (title · quote · timestamp · context)" value={fullBrief} />
      <CopyableLink label="Reddit title" value={social.redditTitle} monospace={false} />
      <CopyableLink label="Reddit body" value={social.redditBody} />
      <CopyableLink label="Hacker News title" value={social.hackerNewsTitle} monospace={false} />
      <CopyableLink label="X / Twitter post" value={social.xPost} monospace={false} />
      <CopyableLink label="Tracked share URL" value={pageUrlWithUtm} />
      <CopyableLink label="Share card image URL" value={cardUrl} />
    </section>
  );
}
