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
  const landing = await getSearchLandingData(phrase, 5, { timeoutMs: 7000 });
  const topMoment = landing.moments[0];

  return new ImageResponse(
    (
      <OgCardShell
        badge="Search result"
        headline={`Search inside video for "${phrase}"`}
        subheadline={`${landing.moments.length} indexed moments across ${landing.videoCount} videos`}
        quote={topMoment?.snippet.slice(0, 220)}
        meta={topMoment ? `${topMoment.timestamp} · ${topMoment.videoTitle}` : undefined}
        footer="Transcript moments · opens on YouTube"
      />
    ),
    { width: 1200, height: 630 }
  );
}
