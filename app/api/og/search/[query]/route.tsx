import { ImageResponse } from "next/og";

import { getSearchLandingData } from "@/lib/search-landing-engine";
import { phraseFromSearchSlug, getSearchQuerySeed } from "@/lib/search-query-seeds";
import { PRODUCT_NAME } from "@/lib/product-copy";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ query: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { query: rawSlug } = await params;
  const seed = getSearchQuerySeed(rawSlug);
  const phrase = seed?.phrase ?? phraseFromSearchSlug(rawSlug);
  const landing = await getSearchLandingData(phrase, 5);
  const topMoment = landing.moments[0];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px",
          background: "linear-gradient(135deg, #0b1120 0%, #1e3a8a 55%, #020617 100%)",
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 22, opacity: 0.8 }}>{PRODUCT_NAME}</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>
            Search inside video for &quot;{phrase}&quot;
          </div>
          <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 900 }}>
            {landing.moments.length} indexed moment{landing.moments.length === 1 ? "" : "s"} across{" "}
            {landing.videoCount} video{landing.videoCount === 1 ? "" : "s"}
          </div>
        </div>

        {topMoment ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 28,
              borderRadius: 24,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              maxWidth: 1000,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600 }}>{topMoment.videoTitle}</div>
            <div style={{ fontSize: 20, color: "#86efac" }}>{topMoment.timestamp}</div>
            <div style={{ fontSize: 22, opacity: 0.85, lineHeight: 1.4 }}>{topMoment.snippet}</div>
          </div>
        ) : (
          <div style={{ fontSize: 24, opacity: 0.8 }}>Paste a YouTube URL to search inside any video.</div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
