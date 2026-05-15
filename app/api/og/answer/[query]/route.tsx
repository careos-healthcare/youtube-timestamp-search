import { ImageResponse } from "next/og";

import { OgCardShell } from "@/lib/og-card-templates";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { phraseFromSearchSlug, getSearchQuerySeed } from "@/lib/search-query-seeds";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ query: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { query: rawSlug } = await params;
  const seed = getSearchQuerySeed(rawSlug);
  const phrase = seed?.phrase ?? phraseFromSearchSlug(rawSlug);
  const landing = await getSearchLandingData(phrase, 8, { timeoutMs: 7000 });
  const answer = landing.answer;

  if (answer.mode === "answer" && answer.answerSnippet && answer.sourceMoment) {
    return new ImageResponse(
      (
        <OgCardShell
          badge="Best answer"
          accent="emerald"
          headline={phrase.endsWith("?") ? phrase : `What is ${phrase}?`}
          subheadline={answer.sourceMoment.videoTitle}
          quote={answer.answerSnippet.slice(0, 220)}
          meta={`${answer.sourceMoment.timestamp} · transcript excerpt`}
          footer="Transcript quote only · opens on YouTube"
        />
      ),
      { width: 1200, height: 630 }
    );
  }

  const topMoment = landing.moments[0];

  return new ImageResponse(
    (
      <OgCardShell
        badge="Search result"
        headline={`Search inside video for "${phrase}"`}
        subheadline={`${landing.moments.length} indexed moments across ${landing.videoCount} videos`}
        quote={topMoment?.snippet.slice(0, 220)}
        meta={topMoment ? `${topMoment.timestamp} · ${topMoment.videoTitle}` : undefined}
        footer="No generated answer — best matching transcript moment"
      />
    ),
    { width: 1200, height: 630 }
  );
}
