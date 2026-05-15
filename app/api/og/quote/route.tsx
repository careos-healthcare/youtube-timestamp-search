import { ImageResponse } from "next/og";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { OgCardShell } from "@/lib/og-card-templates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim() ?? "";
  const phrase = searchParams.get("q")?.trim() ?? "";
  const timestamp = searchParams.get("t")?.trim() ?? "";
  const snippet = searchParams.get("snippet")?.trim() ?? "";

  if (!videoId) {
    return new Response("Missing videoId", { status: 400 });
  }

  const indexed = await getIndexedVideoById(videoId);
  const title = indexed?.title ?? `Video ${videoId}`;
  const channelName = indexed?.channelName;
  const quote = snippet || indexed?.previewSnippet?.slice(0, 220) || `Moment for "${phrase}"`;

  return new ImageResponse(
    (
      <OgCardShell
        badge="Quote card"
        accent="emerald"
        headline={title}
        subheadline={
          channelName ? `${channelName}${phrase ? ` · “${phrase}”` : ""}` : phrase || undefined
        }
        quote={quote.slice(0, 240)}
        meta={timestamp ? `${timestamp} · spoken moment` : "Timestamped transcript"}
        footer="Opens on YouTube · transcript link only"
      />
    ),
    { width: 1200, height: 630 }
  );
}
