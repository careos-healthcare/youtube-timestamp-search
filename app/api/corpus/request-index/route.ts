import { NextResponse } from "next/server";

import { enqueueRequestedSource } from "@/lib/corpus/ingestion-queue";

export const runtime = "nodejs";

type Body = {
  requestedUrl?: string;
  topic?: string;
  sourceType?: string;
  surface?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const url = typeof body.requestedUrl === "string" ? body.requestedUrl.trim() : "";
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Invalid requestedUrl" }, { status: 400 });
    }

    enqueueRequestedSource({
      requestedUrl: url,
      topic: typeof body.topic === "string" ? body.topic.trim() || undefined : undefined,
      sourceType: typeof body.sourceType === "string" ? body.sourceType.trim() || undefined : undefined,
      surface: typeof body.surface === "string" ? body.surface.trim() || undefined : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[corpus/request-index]", err);
    return NextResponse.json({ error: "Queue write failed" }, { status: 503 });
  }
}
