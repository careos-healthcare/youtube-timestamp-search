#!/usr/bin/env tsx

import { loadLocalEnv } from "../lib/ingestion-script-env";
import {
  embedTexts,
  getEmbeddingModelName,
  hashEmbeddingText,
  isEmbeddingProviderAvailable,
} from "../lib/search/embedding-provider";
import {
  countEmbeddedSegments,
  listSegmentEmbeddingCandidates,
  loadEmbeddedTextHashes,
  upsertSegmentEmbeddings,
} from "../lib/search/embedding-store";
import { isSupabaseTranscriptStoreConfigured } from "../lib/supabase";

const PAGE_SIZE = 250;
const EMBED_BATCH_SIZE = 32;

function printUsage() {
  console.log(`Usage:
  npm run embeddings:backfill -- [options]

Options:
  --limit <n>       Process up to N transcript segments (default: unlimited)
  --videoId <id>    Restrict to one YouTube video ID
  --dry-run         Print candidates without calling OpenAI or writing to Supabase

Environment:
  OPENAI_API_KEY
  EMBEDDING_MODEL=text-embedding-3-small
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  const videoIdIndex = argv.findIndex((arg) => arg === "--videoId");

  return {
    limit: limitIndex !== -1 ? Math.max(Number(argv[limitIndex + 1]), 1) : undefined,
    videoId: videoIdIndex !== -1 ? argv[videoIdIndex + 1] : undefined,
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const model = getEmbeddingModelName();

  if (!isSupabaseTranscriptStoreConfigured()) {
    console.error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  if (!args.dryRun && !isEmbeddingProviderAvailable()) {
    console.error("OPENAI_API_KEY is required for embedding backfill.");
    process.exit(1);
  }

  const existingHashes = await loadEmbeddedTextHashes({
    videoId: args.videoId,
    embeddingModel: model,
  });

  let offset = 0;
  let scanned = 0;
  let skipped = 0;
  let embedded = 0;
  const pending: Array<{
    videoId: string;
    segmentIndex: number;
    transcriptId?: string;
    startSeconds: number;
    text: string;
    textHash: string;
  }> = [];

  console.log(
    `Starting embedding backfill model=${model} dryRun=${args.dryRun} existingEmbedded=${existingHashes.size}`
  );

  while (true) {
    if (args.limit && scanned >= args.limit) break;

    const pageLimit = args.limit ? Math.min(PAGE_SIZE, args.limit - scanned) : PAGE_SIZE;
    if (pageLimit <= 0) break;

    const candidates = await listSegmentEmbeddingCandidates({
      limit: pageLimit,
      offset,
      videoId: args.videoId,
    });

    if (candidates.length === 0) break;

    for (const candidate of candidates) {
      scanned += 1;
      const text = candidate.text.trim();
      if (!text) {
        skipped += 1;
        continue;
      }

      const textHash = hashEmbeddingText(text);
      if (existingHashes.has(textHash)) {
        skipped += 1;
        continue;
      }

      pending.push({ ...candidate, text, textHash });
      existingHashes.add(textHash);

      if (pending.length >= EMBED_BATCH_SIZE) {
        const batchResult = await flushBatch(pending.splice(0, pending.length), {
          dryRun: args.dryRun,
          model,
        });
        embedded += batchResult;
      }

      if (args.limit && scanned >= args.limit) break;
    }

    offset += candidates.length;
    if (candidates.length < pageLimit) break;
  }

  if (pending.length > 0) {
    embedded += await flushBatch(pending, { dryRun: args.dryRun, model });
  }

  const totalEmbedded = await countEmbeddedSegments(model);
  console.log("\nBackfill summary:");
  console.log(
    JSON.stringify(
      {
        model,
        scanned,
        skipped,
        embedded,
        dryRun: args.dryRun,
        totalEmbeddedInStore: totalEmbedded,
      },
      null,
      2
    )
  );
}

async function flushBatch(
  batch: Array<{
    videoId: string;
    segmentIndex: number;
    transcriptId?: string;
    startSeconds: number;
    text: string;
    textHash: string;
  }>,
  options: { dryRun: boolean; model: string }
) {
  if (batch.length === 0) return 0;

  if (options.dryRun) {
    console.log(`[dry-run] would embed ${batch.length} segments`, {
      firstVideoId: batch[0]?.videoId,
      firstSegmentIndex: batch[0]?.segmentIndex,
    });
    return batch.length;
  }

  const { embeddings, dimensions } = await embedTexts(
    batch.map((row) => row.text),
    { batchSize: EMBED_BATCH_SIZE }
  );

  await upsertSegmentEmbeddings(
    batch.map((row, index) => ({
      ...row,
      embedding: embeddings[index] ?? [],
      embeddingModel: options.model,
      dimensions,
    }))
  );

  console.log(`Embedded ${batch.length} segments (latest video ${batch.at(-1)?.videoId})`);
  return batch.length;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
