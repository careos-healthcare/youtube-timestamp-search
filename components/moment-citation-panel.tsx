"use client";

import { useCallback, useState } from "react";

import { trackPersistentEvent } from "@/lib/analytics";
import type { MomentCitationBundle } from "@/lib/citations/moment-citation";
import { citationAccessDateUtc } from "@/lib/citations/moment-citation";

type CitationFormat = "markdown" | "plainText" | "academic" | "htmlEmbed";

function formatLabel(f: CitationFormat) {
  switch (f) {
    case "markdown":
      return "Markdown";
    case "plainText":
      return "Plain text";
    case "academic":
      return "Academic-style";
    case "htmlEmbed":
      return "HTML embed";
    default:
      return f;
  }
}

export function MomentCitationPanel(props: {
  bundle: MomentCitationBundle;
  momentId: string;
  videoId: string;
  phrase: string;
  youtubeUrl: string;
  /** Smaller headings / tighter grid for share panel reuse */
  compact?: boolean;
  /** Sets `id` on the outer section for in-page links (e.g. share panel). */
  citeSectionId?: string;
}) {
  const { bundle, momentId, videoId, phrase, youtubeUrl, compact, citeSectionId } = props;
  const [copied, setCopied] = useState<CitationFormat | null>(null);

  const fireCopy = useCallback(
    async (format: CitationFormat, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        void trackPersistentEvent(format === "htmlEmbed" ? "moment_embed_copy" : "moment_citation_copy", {
          momentId,
          videoId,
          phrase,
          format,
        });
        setCopied(format);
        window.setTimeout(() => setCopied(null), 1600);
      } catch {
        setCopied(null);
      }
    },
    [momentId, phrase, videoId]
  );

  const heading = compact ? "text-sm font-semibold" : "text-base font-semibold";
  const sub = compact ? "text-xs" : "text-sm";

  const blocks: { format: CitationFormat; body: string }[] = [
    {
      format: "markdown",
      body: bundle.markdown.replace(
        /\*\*Retrieved:\*\* \d{4}-\d{2}-\d{2}/,
        `**Retrieved:** ${citationAccessDateUtc()}`
      ),
    },
    { format: "plainText", body: bundle.plainText.replace(/Retrieved: \d{4}-\d{2}-\d{2}/, `Retrieved: ${citationAccessDateUtc()}`) },
    { format: "academic", body: bundle.academic.replace(/Accessed \d{4}-\d{2}-\d{2}\./, `Accessed ${citationAccessDateUtc()}.`) },
    { format: "htmlEmbed", body: bundle.htmlEmbed },
  ];

  return (
    <section
      id={citeSectionId}
      className={`rounded-2xl border border-amber-400/25 bg-amber-500/5 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}
    >
      <div className={compact ? "mb-3" : "mb-4"}>
        <h2 className={`${heading} text-white`}>Cite this moment</h2>
        <p className={`${sub} mt-1 text-slate-300`}>
          Reference-friendly exports — quote, video, channel, timestamps, and links. No account required.
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        {blocks.map(({ format, body }) => (
          <div key={format} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-100/90">
                {formatLabel(format)}
              </p>
              <button
                type="button"
                onClick={() => void fireCopy(format, body)}
                className="inline-flex h-8 shrink-0 items-center rounded-full border border-amber-400/30 bg-amber-500/15 px-3 text-xs font-medium text-amber-50 hover:bg-amber-500/25"
              >
                {copied === format ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
              {body}
            </pre>
          </div>
        ))}
      </div>

      <div className={`mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${compact ? "" : ""}`}>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100 hover:bg-blue-500/20"
          onClick={() =>
            void trackPersistentEvent("moment_youtube_citation_click", {
              momentId,
              videoId,
              phrase,
              format: "youtube_timestamp",
            })
          }
        >
          Open on YouTube at timestamp
        </a>
        <p className="text-xs text-slate-500">
          Canonical:{" "}
          <span className="break-all font-mono text-slate-400">{bundle.canonicalMomentUrl}</span>
        </p>
      </div>
    </section>
  );
}
