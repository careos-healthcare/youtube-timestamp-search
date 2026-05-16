import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  appendRejectedOrFailedRows,
  computeRetryDelayMs,
  enqueueCandidates,
  getIngestionQueuePaths,
  getPendingJobs,
  getQueueStats,
  loadQueue,
  saveQueue,
  updateJob,
  type IngestionJob,
} from "@/lib/ingestion-queue";
import { generateSeedBatchCandidates } from "@/lib/seed-batch-generator";
import { SEED_CHANNEL_CATALOG, SEED_CHANNEL_CATEGORIES } from "@/lib/seed-channel-catalog";
import {
  checkTranscriptAvailability,
  formatAvailabilityResultLine,
} from "@/lib/transcript-availability-check";
import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { ingestSeedTranscript } from "@/lib/seed-transcript-ingestion";
import { listCachedTranscripts } from "@/lib/transcript-cache";
import { getSupabaseAdminClient, isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";

export type DiscoverChannelsResult = {
  generatedAt: string;
  channelCount: number;
  candidateCount: number;
  excludedCsvCount: number;
  categories: string[];
  candidates: SeedTranscriptInput[];
  channels: Array<{
    slug: string;
    name: string;
    category: string;
    videoCount: number;
    eligibleCount: number;
  }>;
};

export type WorkerRunResult = {
  processed: number;
  indexed: number;
  skipped: number;
  failed: number;
  rejected: number;
};

export type RefreshRunResult = {
  processed: number;
  refreshed: number;
  failed: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverChannelCandidates(options?: {
  limit?: number;
  categories?: string[];
  channelSlugs?: string[];
  dataDir?: string;
}): Promise<DiscoverChannelsResult> {
  const dataDir = options?.dataDir ?? join(process.cwd(), "data");
  const limit = options?.limit ?? 100;
  const { candidates, excludedCount, channelCount } = generateSeedBatchCandidates({
    limit,
    categories: options?.categories,
    channelSlugs: options?.channelSlugs,
    dataDir,
  });

  const channels = SEED_CHANNEL_CATALOG.map((channel) => ({
    slug: channel.slug,
    name: channel.name,
    category: channel.category,
    videoCount: channel.videos.length,
    eligibleCount: channel.videos.length,
  }));

  return {
    generatedAt: new Date().toISOString(),
    channelCount,
    candidateCount: candidates.length,
    excludedCsvCount: excludedCount,
    categories: [...SEED_CHANNEL_CATEGORIES],
    candidates,
    channels,
  };
}

export function persistDiscoverySnapshot(
  discovery: DiscoverChannelsResult,
  paths = getIngestionQueuePaths()
) {
  writeFileSync(
    paths.discoveryFile,
    JSON.stringify(
      {
        generatedAt: discovery.generatedAt,
        channelCount: discovery.channelCount,
        candidateCount: discovery.candidateCount,
        excludedCsvCount: discovery.excludedCsvCount,
        categories: discovery.categories,
        channels: discovery.channels,
        candidateVideoIds: discovery.candidates.map((c) => c.videoId).filter(Boolean),
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function preflightAndEnqueue(
  candidates: SeedTranscriptInput[],
  options?: {
    delayMs?: number;
    verify?: boolean;
    source?: string;
    dataDir?: string;
  }
) {
  const delayMs = options?.delayMs ?? Number(process.env.CHECK_DELAY_MS ?? 1500);
  const verify = options?.verify ?? true;
  const accepted: SeedTranscriptInput[] = [];
  const rejectedJobs: IngestionJob[] = [];

  if (!verify) {
    return enqueueCandidates(candidates, {
      source: options?.source ?? "catalog-queue",
      dataDir: options?.dataDir,
    });
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const availability = await checkTranscriptAvailability(candidate);
    console.log(`${index + 1}/${candidates.length} ${formatAvailabilityResultLine(availability)}`);

    if (availability.available) {
      accepted.push(candidate);
    } else {
      const videoId = availability.videoId;
      rejectedJobs.push({
        id: `rejected-${videoId}`,
        videoId,
        url: candidate.url ?? "",
        category: candidate.category,
        creator: candidate.creator,
        topic: candidate.topic,
        priority: candidate.priority,
        status: "rejected",
        attempts: 0,
        maxAttempts: 0,
        lastError: availability.reason,
        source: options?.source ?? "availability-check",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (index < candidates.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const paths = getIngestionQueuePaths();
  if (rejectedJobs.length > 0) {
    appendRejectedOrFailedRows(rejectedJobs, "rejected", paths);
    const queue = loadQueue(paths);
    queue.jobs.push(...rejectedJobs);
    saveQueue(queue, paths);
  }

  const enqueueResult = await enqueueCandidates(accepted, {
    source: options?.source ?? "catalog-queue",
    dataDir: options?.dataDir,
  });

  return { ...enqueueResult, availabilityRejected: rejectedJobs.length };
}

export async function runIngestionWorker(options?: {
  limit?: number;
  delayMs?: number;
  baseRetryDelayMs?: number;
  videoIds?: string[];
}) {
  const limit = options?.limit ?? Number(process.env.INGEST_WORKER_BATCH ?? 10);
  const delayMs = options?.delayMs ?? Number(process.env.SEED_DELAY_MS ?? 1500);
  const baseRetryDelayMs = options?.baseRetryDelayMs ?? delayMs;
  const paths = getIngestionQueuePaths();
  const pending = getPendingJobs(limit, paths, { videoIds: options?.videoIds });

  const result: WorkerRunResult = {
    processed: 0,
    indexed: 0,
    skipped: 0,
    failed: 0,
    rejected: 0,
  };

  for (let index = 0; index < pending.length; index += 1) {
    const job = pending[index];
    updateJob(job.id, { status: "processing", attempts: job.attempts + 1 }, paths);

    const ingestResult = await ingestSeedTranscript({
      videoId: job.videoId,
      url: job.url,
      category: job.category,
      creator: job.creator,
      topic: job.topic,
      priority: job.priority,
    });

    result.processed += 1;

    if (ingestResult.status === "indexed") {
      result.indexed += 1;
      updateJob(
        job.id,
        {
          status: "completed",
          segmentCount: ingestResult.segmentCount,
          title: ingestResult.title,
          lastError: undefined,
        },
        paths
      );
      await syncJobToSupabase(job.videoId, "completed", ingestResult.segmentCount);
    } else if (ingestResult.status === "skipped") {
      result.skipped += 1;
      updateJob(job.id, { status: "skipped", lastError: ingestResult.reason }, paths);
    } else {
      const updated = updateJob(
        job.id,
        {
          status: "failed",
          lastError: ingestResult.reason,
          nextRetryAt: new Date(
            Date.now() + computeRetryDelayMs(job.attempts + 1, baseRetryDelayMs)
          ).toISOString(),
        },
        paths
      );

      if (updated && updated.attempts >= updated.maxAttempts) {
        appendRejectedOrFailedRows([updated], "failed", paths);
        result.failed += 1;
      } else {
        result.failed += 1;
      }
    }

    console.log(
      `[worker] ${index + 1}/${pending.length} ${job.videoId} -> ${ingestResult.status}${
        ingestResult.reason ? ` (${ingestResult.reason})` : ""
      }`
    );

    if (index < pending.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return result;
}

export async function refreshIndexedCorpus(options?: {
  limit?: number;
  delayMs?: number;
  oldestFirst?: boolean;
}) {
  const limit = options?.limit ?? Number(process.env.INGEST_REFRESH_LIMIT ?? 20);
  const delayMs = options?.delayMs ?? Number(process.env.SEED_DELAY_MS ?? 1500);
  const summaries = await listCachedTranscripts();
  const sorted = [...summaries].sort((left, right) => {
    const compare = left.fetchedAt.localeCompare(right.fetchedAt);
    return options?.oldestFirst === false ? -compare : compare;
  });

  const targets = sorted.slice(0, limit);
  const result: RefreshRunResult = { processed: 0, refreshed: 0, failed: 0 };

  for (let index = 0; index < targets.length; index += 1) {
    const summary = targets[index];
    const ingestResult = await ingestSeedTranscript(
      { videoId: summary.videoId, url: summary.videoUrl },
      { skipCacheCheck: true }
    );

    result.processed += 1;
    if (ingestResult.status === "indexed") {
      result.refreshed += 1;
    } else {
      result.failed += 1;
    }

    console.log(
      `[refresh] ${index + 1}/${targets.length} ${summary.videoId} -> ${ingestResult.status}`
    );

    if (index < targets.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return result;
}

async function syncJobToSupabase(videoId: string, status: string, segmentCount?: number) {
  if (!isSupabaseTranscriptStoreConfigured()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    await supabase.from("ingestion_jobs").upsert(
      {
        video_id: videoId,
        status,
        segment_count: segmentCount ?? null,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "video_id" }
    );
  } catch {
    // Optional mirror table — file queue remains source of truth.
  }
}

export function getPipelineSnapshot() {
  const paths = getIngestionQueuePaths();
  return {
    paths,
    queue: getQueueStats(paths),
  };
}
