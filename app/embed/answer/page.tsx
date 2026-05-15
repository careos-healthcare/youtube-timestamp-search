import Link from "next/link";

import { getSearchLandingData } from "@/lib/search-landing-engine";
import { sanitizeSearchPhrase } from "@/lib/search-query-guard";
import { buildSearchPath, getSiteUrl } from "@/lib/seo";
import { appendShareUtm } from "@/lib/clip-distribution";

type EmbedAnswerPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function EmbedAnswerPage({ searchParams }: EmbedAnswerPageProps) {
  const { q } = await searchParams;
  const phrase = sanitizeSearchPhrase(q ?? "what is rag");
  const landing = await getSearchLandingData(phrase, 6, { timeoutMs: 7000, bypassCache: true });
  const answer = landing.answer;
  const trackedSearch = appendShareUtm(`${getSiteUrl()}${buildSearchPath(phrase)}`, {
    source: "embed",
    medium: "embed",
    campaign: answer.mode === "answer" ? "answer" : "search",
    content: phrase,
  });

  return (
    <main className="p-4">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Transcript answer card</p>
        <h1 className="mt-2 text-lg font-semibold text-white">
          {answer.mode === "answer" ? `Best answer for "${phrase}"` : `Moments for "${phrase}"`}
        </h1>

        {answer.mode === "answer" && answer.answerSnippet && answer.sourceMoment ? (
          <>
            <blockquote className="mt-3 border-l-2 border-emerald-300/40 pl-3 text-sm leading-7 text-slate-100">
              &quot;{answer.answerSnippet}&quot;
            </blockquote>
            <p className="mt-2 text-xs text-slate-400">
              {answer.sourceMoment.videoTitle} · {answer.sourceMoment.timestamp}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {answer.jumpUrl ? (
                <a
                  href={answer.jumpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 text-sm text-emerald-100"
                >
                  Play on YouTube
                </a>
              ) : null}
              <Link
                href={trackedSearch}
                target="_blank"
                className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-sm text-slate-200"
              >
                Full search page
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-300">
              No high-confidence single answer. Browse {landing.moments.length} matching transcript
              moments on the full search page.
            </p>
            <Link
              href={trackedSearch}
              target="_blank"
              className="mt-4 inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm text-blue-100"
            >
              Open search results
            </Link>
          </>
        )}

        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Transcript excerpt only. Opens on YouTube. No video download or rehosting.
        </p>
      </div>
    </main>
  );
}
