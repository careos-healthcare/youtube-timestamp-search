"use client";

import { useEffect } from "react";
import Link from "next/link";

import { SaveMomentButton } from "@/components/save-moment-button";
import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { SearchResultFeedback } from "@/components/search-result-feedback";
import { ShareActions } from "@/components/share-actions";
import { ViralShareBlock } from "@/components/viral-share-block";
import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import { recordTimestampClickMilestone } from "@/lib/growth/session-metrics";
import type { ViralShareContext } from "@/lib/growth/viral-share-text";
import { NO_PHRASE_MATCH_COPY } from "@/lib/empty-state-copy";
import { renderHighlightedText } from "@/lib/highlight";
import type { SearchResult } from "@/lib/transcript-types";
import { evaluateMomentQualitySignals } from "@/lib/quality";
import { buildMomentUrl, getSiteUrl } from "@/lib/seo";

type TranscriptResultsProps = {
  results: SearchResult[];
  searchedPhrase: string;
  videoId: string;
  shareUrl: string;
  videoTitle?: string;
  channelName?: string;
};

export function TranscriptResults({
  results,
  searchedPhrase,
  videoId,
  shareUrl,
  videoTitle = "",
  channelName,
}: TranscriptResultsProps) {
  const title = videoTitle.trim() || `Video ${videoId}`;

  useEffect(() => {
    if (results.length === 0) {
      trackEvent("no_results", {
        videoId,
        phraseLength: searchedPhrase.length,
      });
    }
  }, [results.length, searchedPhrase.length, videoId]);

  if (results.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>{NO_PHRASE_MATCH_COPY}</p>
        <p className="mt-3">
          <Link href="/" className="text-blue-200 hover:text-blue-100">
            Search another video
          </Link>
          {" · "}
          <Link href="/trending" className="text-blue-200 hover:text-blue-100">
            Trending discovery
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>
          {results.length} matching moment{results.length === 1 ? "" : "s"} found for &quot;
          {searchedPhrase}&quot;.
        </p>
        <div className="mt-3">
          <ShareActions shareUrl={shareUrl} />
        </div>
      </div>

      {results.map((result, index) => {
        const ctx: ViralShareContext = {
          query: searchedPhrase,
          videoTitle: title,
          channelName,
          snippet: result.snippet,
          timestampLabel: result.timestamp,
          youtubeUrl: result.openUrl,
          momentPageUrl: `${getSiteUrl()}${result.pageUrl}`,
          videoId,
        };
        const quality = evaluateMomentQualitySignals({
          phrase: searchedPhrase,
          snippet: result.snippet,
          videoTitle: title,
          channelName,
          startSeconds: result.start,
        });
        const syntheticId = `${videoId}:${Math.round(result.start)}`;
        return (
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
                <MomentQualitySignals
                  evaluation={quality}
                  momentId={syntheticId}
                  videoId={videoId}
                  phrase={searchedPhrase}
                  surface="search_result"
                  compact
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={result.openUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    recordTimestampClickMilestone({ query: searchedPhrase, videoId });
                    trackEvent("youtube_timestamp_click", {
                      videoId,
                      position: index + 1,
                      timestamp: result.timestamp,
                    });
                    trackPersistentEvent("youtube_open", {
                      query: searchedPhrase,
                      videoId,
                      timestamp: result.timestamp,
                    });
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium whitespace-nowrap text-blue-100 transition hover:bg-blue-400/20"
                >
                  Open at this moment
                </a>
                <Link
                  href={result.pageUrl}
                  onClick={() =>
                    trackEvent("result_click", {
                      videoId,
                      position: index + 1,
                      timestamp: result.timestamp,
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 hover:bg-white/10"
                >
                  View indexed result
                </Link>
                <SaveMomentButton
                  query={searchedPhrase}
                  videoId={videoId}
                  title={title}
                  channel={channelName}
                  timestamp={result.timestamp}
                  snippet={result.snippet}
                  youtubeUrl={result.openUrl}
                  momentPageUrl={result.pageUrl}
                />
                <ShareActions shareUrl={buildMomentUrl(videoId, searchedPhrase)} label="Share result" />
              </div>
              <ViralShareBlock context={ctx} compact />
            </div>
          </article>
        );
      })}

      <SearchResultFeedback
        resultCount={results.length}
        query={searchedPhrase}
        videoId={videoId}
      />
    </section>
  );
}
