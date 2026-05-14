import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getIngestionQueuePaths, getQueueStats } from "@/lib/ingestion-queue";
import { listCachedTranscripts, getTranscriptCacheMode } from "@/lib/transcript-cache";
import { loadExcludedVideoIds } from "@/lib/seed-batch-generator";
import { SEED_CHANNEL_CATALOG } from "@/lib/seed-channel-catalog";

export async function buildCorpusGrowthMetrics() {
  const transcripts = await listCachedTranscripts();
  const searchableSegments = transcripts.reduce((sum, row) => sum + row.segmentCount, 0);
  const dataDir = join(process.cwd(), "data");
  const excludedCsv = loadExcludedVideoIds(dataDir);

  const byCategory = new Map<string, number>();
  for (const row of transcripts) {
    const key = row.channelName ?? "unknown";
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    cacheMode: getTranscriptCacheMode(),
    indexedVideos: transcripts.length,
    searchableSegments,
    estimatedHours: Number(((searchableSegments * 4) / 3600).toFixed(1)),
    catalogChannels: SEED_CHANNEL_CATALOG.length,
    catalogVideos: SEED_CHANNEL_CATALOG.reduce((sum, ch) => sum + ch.videos.length, 0),
    csvLedgerVideoIds: excludedCsv.size,
    topChannels: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count })),
  };
}

export function formatIngestionPipelineReport() {
  const paths = getIngestionQueuePaths();
  const stats = getQueueStats(paths);

  return `# Ingestion pipeline report

Generated: ${new Date().toISOString()}

## Queue status

| Metric | Value |
|--------|------:|
| Total jobs | ${stats.total} |
| Pending | ${stats.counts.pending} |
| Processing | ${stats.counts.processing} |
| Completed | ${stats.counts.completed} |
| Failed | ${stats.counts.failed} |
| Skipped | ${stats.counts.skipped} |
| Rejected | ${stats.counts.rejected} |
| Queue updated | ${stats.updatedAt} |

## Paths

| Artifact | Path |
|----------|------|
| Queue file | \`${paths.queueFile}\` |
| Rejected CSV | \`${paths.rejectedCsv}\` |
| Failed CSV | \`${paths.failedCsv}\` |
| Last discovery | \`${paths.discoveryFile}\` |

## Commands

\`\`\`bash
npm run ingest:discover-channels
npm run ingest:queue -- --limit 50 --verify
npm run ingest:worker -- --limit 10
npm run ingest:refresh -- --limit 20
npm run ingest:validate
\`\`\`

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| \`SEED_DELAY_MS\` | 1500 | Delay between ingest/refresh operations |
| \`CHECK_DELAY_MS\` | 1500 | Delay between availability checks |
| \`INGEST_WORKER_BATCH\` | 10 | Default worker batch size |
| \`INGEST_REFRESH_LIMIT\` | 20 | Default refresh batch size |

## Legacy CSV seeding (unchanged)

\`\`\`bash
npm run generate:seed-batch -- --batch 006 --limit 100
npm run check:transcripts -- data/seed-videos-raw-batch-006.csv
npm run seed:transcripts:csv -- data/seed-videos-raw-batch-006.available.csv
\`\`\`
`;
}

export async function formatCorpusGrowthReport() {
  const metrics = await buildCorpusGrowthMetrics();

  const channelRows = metrics.topChannels
    .map((row, index) => `| ${index + 1} | ${row.name} | ${row.count} |`)
    .join("\n");

  return `# Corpus growth report

Generated: ${metrics.generatedAt}

## Index size

| Metric | Value |
|--------|------:|
| Indexed videos | ${metrics.indexedVideos} |
| Searchable segments | ${metrics.searchableSegments} |
| Estimated indexed hours | ${metrics.estimatedHours} |
| Cache mode | ${metrics.cacheMode} |
| CSV ledger video IDs | ${metrics.csvLedgerVideoIds} |

## Catalog capacity

| Metric | Value |
|--------|------:|
| Catalog channels | ${metrics.catalogChannels} |
| Catalog videos | ${metrics.catalogVideos} |

## Top indexed channels

| Rank | Channel | Videos |
|------|---------|-------:|
${channelRows || "| — | — | — |"}

## Regenerate

\`\`\`bash
npm run ingest:refresh
\`\`\`
`;
}

export async function writeIngestionReports() {
  const pipelinePath = join(process.cwd(), "INGESTION_PIPELINE_REPORT.md");
  const growthPath = join(process.cwd(), "CORPUS_GROWTH_REPORT.md");

  writeFileSync(pipelinePath, formatIngestionPipelineReport(), "utf8");
  writeFileSync(growthPath, await formatCorpusGrowthReport(), "utf8");

  return { pipelinePath, growthPath };
}
