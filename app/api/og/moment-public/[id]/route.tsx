import { ImageResponse } from "next/og";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { getPublicMomentById } from "@/lib/moments/load-public-moments";
import { OgCardShell } from "@/lib/og-card-templates";
import { isPublicMomentId } from "@/lib/moments/stable-id";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!isPublicMomentId(id)) {
    return new Response("Not found", { status: 404 });
  }

  const row = getPublicMomentById(id);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const indexed = await getIndexedVideoById(row.videoId);
  const title = row.videoTitle ?? indexed?.title ?? `Video ${row.videoId}`;
  const channelName = row.channelName ?? indexed?.channelName;
  const quote = row.snippet.slice(0, 240) || indexed?.previewSnippet?.slice(0, 220) || `Moment for "${row.phrase}"`;

  return new ImageResponse(
    (
      <OgCardShell
        badge="Canonical moment"
        accent="violet"
        headline={title}
        subheadline={
          channelName ? `${channelName}${row.phrase ? ` · "${row.phrase}"` : ""}` : row.phrase || undefined
        }
        quote={quote}
        meta={`${row.timestamp} · indexed transcript`}
        footer="Link opens on YouTube · no video rehosting"
      />
    ),
    { width: 1200, height: 630 }
  );
}
