import { NextResponse } from "next/server";

import { trackServerEvent, type AnalyticsEventName } from "@/lib/analytics";
import { getSupabaseAdminClient } from "@/lib/supabase";

type AnalyticsBody = {
  event?: AnalyticsEventName;
  query?: string;
  videoId?: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyticsBody;
    const event = body.event;

    if (!event) {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
    }

    trackServerEvent(event, {
      query: body.query,
      videoId: body.videoId,
      ...(body.payload ?? {}),
    });

    const supabase = getSupabaseAdminClient();
    if (supabase && (body.query || body.videoId)) {
      await supabase.from("search_analytics_events").insert({
        event_name: event,
        query: body.query ?? null,
        video_id: body.videoId ?? null,
        payload: body.payload ?? {},
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
