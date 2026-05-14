import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadExcludedVideoIds } from "@/lib/seed-batch-generator";
import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { resolveSeedVideoId } from "@/lib/seed-transcript-ingestion";
import { seedInputToCsvRecord, writeAvailabilityCsv } from "@/lib/transcript-availability-check";
import { hasCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type IngestionJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped"
  | "rejected";

export type IngestionJob = {
  id: string;
  videoId: string;
  url: string;
  category?: string;
  creator?: string;
  topic?: string;
  priority?: number;
  status: IngestionJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  segmentCount?: number;
  title?: string;
};

export type IngestionQueueFile = {
  version: 1;
  updatedAt: string;
  jobs: IngestionJob[];
};

export type EnqueueResult = {
  added: number;
  skippedDuplicate: number;
  skippedCached: number;
  skippedInQueue: number;
};

export type IngestionQueuePaths = {
  root: string;
  queueFile: string;
  rejectedCsv: string;
  failedCsv: string;
  discoveryFile: string;
};

const QUEUE_VERSION = 1 as const;
const DEFAULT_MAX_ATTEMPTS = 3;

export function getIngestionQueuePaths(baseDir?: string): IngestionQueuePaths {
  const root = baseDir ?? join(process.cwd(), "data", "ingestion");
  return {
    root,
    queueFile: join(root, "queue.json"),
    rejectedCsv: join(root, "rejected.csv"),
    failedCsv: join(root, "failed.csv"),
    discoveryFile: join(root, "last-discovery.json"),
  };
}

export function ensureIngestionDirs(paths: IngestionQueuePaths = getIngestionQueuePaths()) {
  if (!existsSync(paths.root)) {
    mkdirSync(paths.root, { recursive: true });
  }
}

export function loadQueue(paths: IngestionQueuePaths = getIngestionQueuePaths()): IngestionQueueFile {
  ensureIngestionDirs(paths);

  if (!existsSync(paths.queueFile)) {
    return { version: QUEUE_VERSION, updatedAt: new Date().toISOString(), jobs: [] };
  }

  try {
    const parsed = JSON.parse(readFileSync(paths.queueFile, "utf8")) as IngestionQueueFile;
    return {
      version: QUEUE_VERSION,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return { version: QUEUE_VERSION, updatedAt: new Date().toISOString(), jobs: [] };
  }
}

export function saveQueue(queue: IngestionQueueFile, paths: IngestionQueuePaths = getIngestionQueuePaths()) {
  ensureIngestionDirs(paths);
  const payload: IngestionQueueFile = {
    ...queue,
    version: QUEUE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(paths.queueFile, JSON.stringify(payload, null, 2), "utf8");
}

export function inputToJob(input: SeedTranscriptInput, source: string): IngestionJob | null {
  const videoId = resolveSeedVideoId(input);
  if (!videoId) return null;

  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    videoId,
    url: input.url ?? getYouTubeWatchUrl(videoId),
    category: input.category,
    creator: input.creator,
    topic: input.topic,
    priority: input.priority,
    status: "pending",
    attempts: 0,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

export async function buildDedupSets(options?: {
  dataDir?: string;
  paths?: IngestionQueuePaths;
}) {
  const dataDir = options?.dataDir ?? join(process.cwd(), "data");
  const paths = options?.paths ?? getIngestionQueuePaths();
  const queue = loadQueue(paths);

  const csvExcluded = loadExcludedVideoIds(dataDir);
  const queueVideoIds = new Set(
    queue.jobs
      .filter((job) => job.status !== "failed" && job.status !== "rejected")
      .map((job) => job.videoId)
  );

  const cached = new Set<string>();
  const summaries = await listCachedTranscripts();
  for (const summary of summaries) {
    cached.add(summary.videoId);
  }

  return { csvExcluded, queueVideoIds, cached };
}

export async function enqueueCandidates(
  candidates: SeedTranscriptInput[],
  options?: {
    source?: string;
    paths?: IngestionQueuePaths;
    dataDir?: string;
    skipAvailabilityRejected?: boolean;
  }
): Promise<EnqueueResult> {
  const paths = options?.paths ?? getIngestionQueuePaths();
  const queue = loadQueue(paths);
  const dedup = await buildDedupSets({ dataDir: options?.dataDir, paths });
  const source = options?.source ?? "manual-enqueue";

  let added = 0;
  let skippedDuplicate = 0;
  let skippedCached = 0;
  let skippedInQueue = 0;

  const existingIds = new Set(queue.jobs.map((job) => job.videoId));

  for (const candidate of candidates) {
    const videoId = resolveSeedVideoId(candidate);
    if (!videoId) continue;

    if (dedup.csvExcluded.has(videoId) || existingIds.has(videoId)) {
      skippedDuplicate += 1;
      continue;
    }

    if (dedup.queueVideoIds.has(videoId)) {
      skippedInQueue += 1;
      continue;
    }

    if (dedup.cached.has(videoId) || (await hasCachedTranscript(videoId))) {
      skippedCached += 1;
      continue;
    }

    const job = inputToJob(candidate, source);
    if (!job) continue;

    queue.jobs.push(job);
    existingIds.add(videoId);
    dedup.queueVideoIds.add(videoId);
    added += 1;
  }

  saveQueue(queue, paths);

  return { added, skippedDuplicate, skippedCached, skippedInQueue };
}

export function getPendingJobs(
  limit: number,
  paths: IngestionQueuePaths = getIngestionQueuePaths()
): IngestionJob[] {
  const queue = loadQueue(paths);
  const now = Date.now();

  return queue.jobs
    .filter((job) => {
      if (job.status !== "pending" && job.status !== "failed") return false;
      if (job.attempts >= job.maxAttempts) return false;
      if (job.nextRetryAt && Date.parse(job.nextRetryAt) > now) return false;
      return true;
    })
    .sort((left, right) => {
      const leftPriority = left.priority ?? 99;
      const rightPriority = right.priority ?? 99;
      return leftPriority - rightPriority || left.createdAt.localeCompare(right.createdAt);
    })
    .slice(0, limit);
}

export function updateJob(
  jobId: string,
  patch: Partial<IngestionJob>,
  paths: IngestionQueuePaths = getIngestionQueuePaths()
) {
  const queue = loadQueue(paths);
  const index = queue.jobs.findIndex((job) => job.id === jobId);
  if (index === -1) return null;

  queue.jobs[index] = {
    ...queue.jobs[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  saveQueue(queue, paths);
  return queue.jobs[index];
}

export function appendRejectedOrFailedRows(
  jobs: IngestionJob[],
  kind: "rejected" | "failed",
  paths: IngestionQueuePaths = getIngestionQueuePaths()
) {
  if (jobs.length === 0) return;

  ensureIngestionDirs(paths);
  const target = kind === "rejected" ? paths.rejectedCsv : paths.failedCsv;
  const rows = jobs.map((job) => ({
    ...seedInputToCsvRecord({
      videoId: job.videoId,
      url: job.url,
      category: job.category,
      creator: job.creator,
      topic: job.topic,
      priority: job.priority,
    }),
    reason: job.lastError ?? (kind === "rejected" ? "Rejected before ingest" : "Ingest failed"),
  }));

  if (existsSync(target)) {
    const existing = readFileSync(target, "utf8").trimEnd();
    const body = rows
      .map((row) =>
        ["url", "video_id", "category", "creator", "topic", "priority", "reason"]
          .map((column) => {
            const value = row[column as keyof typeof row] ?? "";
            return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(",")
      )
      .join("\n");
    writeFileSync(target, `${existing}\n${body}\n`, "utf8");
  } else {
    writeAvailabilityCsv(target, rows, ["reason"]);
  }
}

export function getQueueStats(paths: IngestionQueuePaths = getIngestionQueuePaths()) {
  const queue = loadQueue(paths);
  const counts: Record<IngestionJobStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    rejected: 0,
  };

  for (const job of queue.jobs) {
    counts[job.status] += 1;
  }

  return {
    total: queue.jobs.length,
    counts,
    updatedAt: queue.updatedAt,
  };
}

export function computeRetryDelayMs(attempts: number, baseDelayMs: number) {
  return Math.min(baseDelayMs * 2 ** Math.max(attempts - 1, 0), baseDelayMs * 8);
}
