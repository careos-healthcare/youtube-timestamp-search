import { NextResponse } from "next/server";

import { getLatestIndexedVideos } from "@/lib/indexed-videos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12), 1), 24);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const page = await getLatestIndexedVideos(limit, offset);
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Could not load latest indexed videos." }, { status: 500 });
  }
}
