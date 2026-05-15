import { ImageResponse } from "next/og";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { getCachedTranscript } from "@/lib/transcript-cache";
import { suggestKeywords } from "@/lib/transcript-search";
import { PRODUCT_NAME } from "@/lib/product-copy";
import { segmentsToTranscriptLines } from "@/lib/transcript-segment-lines";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ videoId: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { videoId } = await params;
  const indexed = await getIndexedVideoById(videoId);
  const cached = indexed ? null : await getCachedTranscript(videoId, { maxSegments: 200 });
  const title = indexed?.title ?? cached?.title ?? `Video ${videoId}`;
  const channelName = indexed?.channelName ?? cached?.channelName;
  const lines = cached ? segmentsToTranscriptLines(cached.segments) : [];
  const keywords = suggestKeywords(lines, "", 4);
  const preview = indexed?.previewSnippet ?? lines[0]?.text ?? "Search inside this indexed long-form video.";

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
          background: "linear-gradient(135deg, #111827 0%, #312e81 50%, #020617 100%)",
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 22, opacity: 0.8 }}>{PRODUCT_NAME}</div>
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.08, maxWidth: 1000 }}>{title}</div>
          {channelName ? <div style={{ fontSize: 26, opacity: 0.85 }}>{channelName}</div> : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: 28,
            borderRadius: 24,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            maxWidth: 1000,
          }}
        >
          <div style={{ fontSize: 22, opacity: 0.9, lineHeight: 1.4 }}>{preview.slice(0, 180)}</div>
          {keywords.length > 0 ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {keywords.map((keyword) => (
                <div
                  key={keyword}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(59,130,246,0.25)",
                    fontSize: 18,
                  }}
                >
                  {keyword}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
