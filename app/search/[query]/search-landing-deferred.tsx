import Link from "next/link";

import { InternalLinksPanel } from "@/components/internal-links-panel";
import { SearchAnswerPanel } from "@/components/search-answer-panel";
import { SearchForm } from "@/components/search-form";
import { SearchLandingResults } from "@/components/search-landing-results";
import { SearchLandingThinContent } from "@/components/search-landing-thin-content";
import { SearchQueryTracker } from "@/components/search-query-tracker";
import { SearchSessionTracker } from "@/components/search-session-tracker";
import { SearchSharePanel } from "@/components/search-share-panel";
import { buildInternalLinkGraph } from "@/lib/internal-linking";
import { buildSearchPageUrl } from "@/lib/og-urls";
import { PRODUCT_WEDGE } from "@/lib/product-copy";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { resolveSearchQuery } from "@/lib/search-query-guard";
import { buildSearchLandingStructuredData } from "@/lib/search-structured-data";
import { buildTranscriptsIndexPath } from "@/lib/seo";

type SearchLandingDeferredProps = {
  query: string;
  phrase: string;
};

export async function SearchLandingDeferred({ query, phrase }: SearchLandingDeferredProps) {
  const momentLimit =
    typeof process !== "undefined" && process.env.VERCEL === "1"
      ? Math.min(40, Number(process.env.SEARCH_PAGE_MOMENT_LIMIT ?? 28))
      : 40;

  const landing = await getSearchLandingData(phrase, momentLimit);
  const resolved = resolveSearchQuery(query, landing.moments.length);

  const structuredData = buildSearchLandingStructuredData(landing);
  const internalLinks = buildInternalLinkGraph({
    phrase: resolved.phrase,
    topVideos: landing.topVideos,
  });
  const canonicalUrl = buildSearchPageUrl(resolved.phrase);

  return (
    <>
      <SearchQueryTracker query={resolved.phrase} resultCount={landing.moments.length} />
      <SearchSessionTracker
        query={resolved.phrase}
        resultCount={landing.moments.length}
        answerMode={landing.answer.mode}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              Shareable search page
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-5xl">
              Exact video moments for &quot;{resolved.phrase}&quot;
            </h1>
            {landing.loadMeta?.timedOut ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                The transcript index took longer than usual to respond, so this page loaded without
                live results. Use the search box below, try again in a moment, or{" "}
                <Link href="/" className="text-amber-50 underline underline-offset-2">
                  paste a YouTube URL
                </Link>{" "}
                to search inside a single video immediately.
              </div>
            ) : null}
            {!landing.loadMeta?.timedOut && landing.loadMeta?.degradedReason === "error" ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                Something went wrong loading live index results. You can still search below or open
                the homepage to paste a video URL.
              </div>
            ) : null}
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-lg">
              {PRODUCT_WEDGE}{" "}
              {landing.loadMeta?.timedOut || landing.loadMeta?.degradedReason === "error"
                ? "Indexed transcript search is temporarily unavailable on this request."
                : `${landing.moments.length} timestamped result${landing.moments.length === 1 ? "" : "s"} across ${landing.videoCount} indexed video${landing.videoCount === 1 ? "" : "s"}.`}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="text-blue-200 hover:text-blue-100">
                Paste a YouTube URL
              </Link>
              <Link href={buildTranscriptsIndexPath()} className="text-blue-200 hover:text-blue-100">
                Browse video index
              </Link>
            </div>
          </div>

          <SearchForm initialPhrase={resolved.phrase} />
        </div>
      </section>

      <SearchAnswerPanel data={landing} />

      <SearchLandingResults data={landing} />

      <SearchSharePanel phrase={resolved.phrase} canonicalUrl={canonicalUrl} landing={landing} />

      {landing.loadMeta?.timedOut || landing.loadMeta?.degradedReason === "error" ? null : landing.moments.length < 3 ? (
        <SearchLandingThinContent phrase={resolved.phrase} momentCount={landing.moments.length} />
      ) : null}

      <InternalLinksPanel
        relatedPhrases={internalLinks.relatedPhrases}
        relatedTopics={internalLinks.relatedTopics}
        relatedVideos={internalLinks.relatedVideos}
      />
    </>
  );
}
