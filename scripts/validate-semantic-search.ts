#!/usr/bin/env tsx

import { loadLocalEnv } from "../lib/ingestion-script-env";
import { countEmbeddedSegments } from "../lib/search/embedding-store";
import { isEmbeddingProviderAvailable } from "../lib/search/embedding-provider";
import { searchKeywordTranscripts } from "../lib/search/keyword-search-provider";
import { hybridSearchTranscripts } from "../lib/search/hybrid-search-engine";
import { getSearchRuntimeConfig, getSemanticFallbackReason } from "../lib/search/search-config";

const VALIDATION_QUERIES = [
  "what is rag",
  "how do transformers work",
  "what is backpropagation",
  "how to learn python",
  "what is kubernetes",
];

function topTimestampSummary(
  results: Array<{ matches: Array<{ start: number; timestamp: string }> }>
) {
  const first = results[0]?.matches[0];
  return first ? `${first.timestamp} (${first.start}s)` : "none";
}

async function main() {
  loadLocalEnv();

  const config = getSearchRuntimeConfig();
  const embeddedCount = await countEmbeddedSegments(config.embeddingModel);

  console.log("Semantic search validation");
  console.log(
    JSON.stringify(
      {
        semanticEnabled: config.semanticSearchEnabled,
        semanticAvailable: config.semanticAvailable,
        embeddingProviderConfigured: isEmbeddingProviderAvailable(),
        embeddingModel: config.embeddingModel,
        embeddedSegmentCount: embeddedCount,
        configuredFallbackReason: getSemanticFallbackReason(),
      },
      null,
      2
    )
  );

  console.log("\nQuery comparison (keyword vs hybrid):");
  for (const query of VALIDATION_QUERIES) {
    const keyword = await searchKeywordTranscripts(query, 10);
    const hybrid = await hybridSearchTranscripts(query, 10);

    console.log(
      JSON.stringify(
        {
          query,
          keywordResultCount: keyword.length,
          keywordTopTimestamp: topTimestampSummary(keyword),
          hybridResultCount: hybrid.results.length,
          hybridTopTimestamp: topTimestampSummary(hybrid.results),
          searchMode: hybrid.diagnostics.searchMode,
          semanticResultCount: hybrid.diagnostics.semanticResultCount,
          fallbackReason: hybrid.diagnostics.fallbackReason ?? null,
        },
        null,
        2
      )
    );
  }

  if (!config.semanticSearchEnabled) {
    console.log("\nSEMANTIC_SEARCH_ENABLED is false — validation completed in safe fallback mode.");
  } else if (!config.semanticAvailable) {
    console.log("\nSemantic infrastructure unavailable — keyword/hybrid-keyword fallback verified.");
  } else if (embeddedCount === 0) {
    console.log("\nNo embedded segments found — run npm run embeddings:backfill after migration.");
  } else {
    console.log("\nSemantic infrastructure available with embedded segments.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
