import { ImageResponse } from "next/og";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { OgCardShell } from "@/lib/og-card-templates";
import { deslugifyQuery } from "@/lib/seo";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { videoId } = await params;
  const { searchParams } = new URL(request.url);
  const phrase = deslugifyQuery(searchParams.get("q") ?? "");
  const timestamp = searchParams.get("t") ?? "";
  const snippet = searchParams.get("snippet") ?? "";

  const indexed = await getIndexedVideoById(videoId);
  const title = indexed?.title ?? `Video ${videoId}`;
  const channelName = indexed?.channelName;
  const quote = snippet || indexed?.previewSnippet?.slice(0, 220) || `Moment for "${phrase}"`;

  return new ImageResponse(
    (
      <OgCardShell
        badge="Video moment"
        accent="violet"
        headline={title}
        subheadline={channelName ? `${channelName}${phrase ? ` · "${phrase}"` : ""}` : phrase || undefined}
        quote={quote.slice(0, 240)}
        meta={timestamp ? `${timestamp} · timestamped transcript` : "Timestamped transcript moment"}
        footer="Link opens on YouTube · no video rehosting"
      />
    ),
    { width: 1200, height: 630 }
  );
}
