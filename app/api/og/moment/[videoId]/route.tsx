import { buildMomentOgPngResponse } from "@/lib/og-moment-share-image";
import { getIndexedVideoById } from "@/lib/indexed-videos";
import { deslugifyQuery } from "@/lib/seo";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: Request, ctx: RouteProps) {
  try {
    const { videoId } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const phrase = deslugifyQuery(searchParams.get("q") ?? "");
    const timestamp = searchParams.get("t") ?? "";
    const snippet = searchParams.get("snippet") ?? "";

    const indexed = await getIndexedVideoById(videoId);
    const title = indexed?.title ?? `Video ${videoId}`;
    const channelName = indexed?.channelName;
    const quote = snippet || indexed?.previewSnippet?.slice(0, 220) || `Moment for "${phrase}"`;
    const subtitle =
      channelName && phrase ? `${channelName} — ${phrase}` : channelName || phrase || undefined;
    const meta = timestamp ? `${timestamp} · transcript moment` : "Timestamped transcript moment";

    return buildMomentOgPngResponse({
      badge: "Video moment",
      title,
      subtitle,
      quote: quote.slice(0, 280),
      meta,
    });
  } catch {
    return buildMomentOgPngResponse({
      badge: "Video moment",
      title: "YouTube transcript moment",
      quote: "Search the transcript and open the exact timestamp on YouTube.",
      meta: "Indexed transcript search",
    });
  }
}
