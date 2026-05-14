import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics";
import { searchCachedTranscripts } from "@/lib/transcript-cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  const results = await searchCachedTranscripts(query);
  trackServerEvent("indexed_transcript_search", {
    queryLength: query.length,
    resultCount: results.length,
  });

  return NextResponse.json({
    query,
    resultCount: results.length,
    results,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "A search query is required." }, { status: 400 });
    }

    const results = await searchCachedTranscripts(query);
    trackServerEvent("indexed_transcript_search", {
      queryLength: query.length,
      resultCount: results.length,
    });

    return NextResponse.json({
      query,
      resultCount: results.length,
      results,
    });
  } catch {
    return NextResponse.json({ error: "Indexed transcript search failed." }, { status: 500 });
  }
}
