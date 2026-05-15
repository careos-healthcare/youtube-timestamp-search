import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics";
import { hybridSearchWithRecovery } from "@/lib/search/hybrid-search-recovery";
import {
  getContinueExploringPhrases,
  getRecoveryQueryAttempts,
  getTrendingSeedQueries,
} from "@/lib/search/query-expansion";
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

  const recovery = await hybridSearchWithRecovery(query, 20);
  const { results, diagnostics } = recovery.hybrid;
  const suggestedSearches = [
    ...getContinueExploringPhrases(query),
    ...getTrendingSeedQueries(6),
  ].filter((q, i, a) => a.indexOf(q) === i);

  trackServerEvent("indexed_transcript_search", {
    queryLength: query.length,
    resultCount: results.length,
    searchMode: diagnostics.searchMode,
    semanticEnabled: diagnostics.semanticEnabled,
    semanticFallback: diagnostics.semanticFallback,
    recoveryPath: recovery.recoveryPath ?? "none",
  });

  const latest = getSearchLandingDiagnosticsLatest();

  return NextResponse.json({
    query,
    appliedQuery: recovery.appliedQuery,
    recoveryPath: recovery.recoveryPath,
    attemptedQueries: recovery.attemptedQueries,
    resultCount: results.length,
    searchMode: diagnostics.searchMode,
    semanticEnabled: diagnostics.semanticEnabled,
    semanticAvailable: diagnostics.semanticAvailable,
    embeddingModel: diagnostics.embeddingModel,
    fallbackReason: diagnostics.fallbackReason ?? null,
    diagnostics,
    results,
    suggestedSearches: suggestedSearches.slice(0, 16),
    trendingAlternatives: getTrendingSeedQueries(8),
    recoveryOrder: getRecoveryQueryAttempts(query).map((a) => a.path),
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

    const recovery = await hybridSearchWithRecovery(query, 20);
    const { results, diagnostics } = recovery.hybrid;
    const suggestedSearches = [
      ...getContinueExploringPhrases(query),
      ...getTrendingSeedQueries(6),
    ].filter((q, i, a) => a.indexOf(q) === i);

    trackServerEvent("indexed_transcript_search", {
      queryLength: query.length,
      resultCount: results.length,
      searchMode: diagnostics.searchMode,
      semanticEnabled: diagnostics.semanticEnabled,
      semanticFallback: diagnostics.semanticFallback,
      recoveryPath: recovery.recoveryPath ?? "none",
    });

    const latest = getSearchLandingDiagnosticsLatest();

    return NextResponse.json({
      query,
      appliedQuery: recovery.appliedQuery,
      recoveryPath: recovery.recoveryPath,
      attemptedQueries: recovery.attemptedQueries,
      resultCount: results.length,
      searchMode: diagnostics.searchMode,
      semanticEnabled: diagnostics.semanticEnabled,
      semanticAvailable: diagnostics.semanticAvailable,
      embeddingModel: diagnostics.embeddingModel,
      fallbackReason: diagnostics.fallbackReason ?? null,
      diagnostics,
      results,
      suggestedSearches: suggestedSearches.slice(0, 16),
      trendingAlternatives: getTrendingSeedQueries(8),
      recoveryOrder: getRecoveryQueryAttempts(query).map((a) => a.path),
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
