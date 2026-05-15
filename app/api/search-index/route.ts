import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics";
import { hybridSearchTranscripts } from "@/lib/search/hybrid-search-engine";
import {
  getSearchLandingDiagnosticsLatest,
  getSearchLandingDiagnosticsRecent,
} from "@/lib/search/search-runtime-diagnostics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  const { results, diagnostics } = await hybridSearchTranscripts(query);
  trackServerEvent("indexed_transcript_search", {
    queryLength: query.length,
    resultCount: results.length,
    searchMode: diagnostics.searchMode,
    semanticEnabled: diagnostics.semanticEnabled,
    semanticFallback: diagnostics.semanticFallback,
  });

  const latest = getSearchLandingDiagnosticsLatest();

  return NextResponse.json({
    query,
    resultCount: results.length,
    searchMode: diagnostics.searchMode,
    semanticEnabled: diagnostics.semanticEnabled,
    semanticAvailable: diagnostics.semanticAvailable,
    embeddingModel: diagnostics.embeddingModel,
    fallbackReason: diagnostics.fallbackReason ?? null,
    diagnostics,
    results,
    degraded: latest?.degraded ?? false,
    timeoutPhase: latest?.timeoutPhase ?? null,
    queryComplexity: latest?.queryComplexity ?? null,
    searchLandingDiagnostics: {
      latest,
      recent: getSearchLandingDiagnosticsRecent(),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "A search query is required." }, { status: 400 });
    }

    const { results, diagnostics } = await hybridSearchTranscripts(query);
    trackServerEvent("indexed_transcript_search", {
      queryLength: query.length,
      resultCount: results.length,
      searchMode: diagnostics.searchMode,
      semanticEnabled: diagnostics.semanticEnabled,
      semanticFallback: diagnostics.semanticFallback,
    });

    const latest = getSearchLandingDiagnosticsLatest();

    return NextResponse.json({
      query,
      resultCount: results.length,
      searchMode: diagnostics.searchMode,
      semanticEnabled: diagnostics.semanticEnabled,
      semanticAvailable: diagnostics.semanticAvailable,
      embeddingModel: diagnostics.embeddingModel,
      fallbackReason: diagnostics.fallbackReason ?? null,
      diagnostics,
      results,
      degraded: latest?.degraded ?? false,
      timeoutPhase: latest?.timeoutPhase ?? null,
      queryComplexity: latest?.queryComplexity ?? null,
      searchLandingDiagnostics: {
        latest,
        recent: getSearchLandingDiagnosticsRecent(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Indexed transcript search failed." }, { status: 500 });
  }
}
