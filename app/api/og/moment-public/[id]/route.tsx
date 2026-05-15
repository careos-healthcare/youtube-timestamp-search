import { buildMomentOgPngResponse } from "@/lib/og-moment-share-image";
import { getIndexedVideoById } from "@/lib/indexed-videos";
import { getPublicMomentById } from "@/lib/moments/load-public-moments";
import { isPublicMomentId } from "@/lib/moments/stable-id";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
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
    const quote =
      row.snippet.slice(0, 280) || indexed?.previewSnippet?.slice(0, 220) || `Moment for "${row.phrase}"`;
    const subtitle =
      channelName && row.phrase ? `${channelName} — ${row.phrase}` : channelName || row.phrase || undefined;

    return buildMomentOgPngResponse({
      badge: "Canonical moment",
      title,
      subtitle,
      quote,
      meta: `${row.timestamp} · indexed transcript`,
    });
  } catch {
    return buildMomentOgPngResponse({
      badge: "Canonical moment",
      title: "Indexed transcript moment",
      quote: "Open the exact timestamp on YouTube — transcript excerpt only.",
      meta: "YouTube Time Search",
    });
  }
}
