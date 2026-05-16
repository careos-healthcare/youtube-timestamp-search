import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CorpusQueueFile, CorpusQueueItem, CorpusQueueName } from "./source-types";
import { recordCorpusPipelineEvent } from "./corpus-analytics";

const QUEUE_FILES: Record<CorpusQueueName, string> = {
  high_priority: "high-priority.json",
  candidate: "candidate.json",
  rejected: "rejected.json",
  requested: "requested.json",
};

function queueDir(root = join(process.cwd(), "data", "ingestion-queues")) {
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  return root;
}

function readQueue(name: CorpusQueueName, root?: string): CorpusQueueFile {
  const dir = root ?? queueDir();
  const p = join(dir, QUEUE_FILES[name]);
  if (!existsSync(p)) {
    return { version: 1, updatedAt: new Date().toISOString(), items: [] };
  }
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as CorpusQueueFile;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return { version: 1, updatedAt: new Date().toISOString(), items: [] };
    }
    return parsed;
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), items: [] };
  }
}

function writeQueue(name: CorpusQueueName, file: CorpusQueueFile, root?: string) {
  const dir = root ?? queueDir();
  const p = join(dir, QUEUE_FILES[name]);
  const next: CorpusQueueFile = { ...file, updatedAt: new Date().toISOString() };
  writeFileSync(p, JSON.stringify(next, null, 2), "utf-8");
}

export function dedupeSource(items: CorpusQueueItem[], incoming: CorpusQueueItem): CorpusQueueItem[] {
  const key = incoming.dedupeKey.trim().toLowerCase();
  return items.filter((i) => i.dedupeKey.trim().toLowerCase() !== key);
}

export function enqueueSource(
  queue: CorpusQueueName,
  item: Omit<CorpusQueueItem, "id" | "createdAt"> & Partial<Pick<CorpusQueueItem, "id" | "createdAt">>,
  options?: { rootDir?: string }
): CorpusQueueItem {
  const doc = readQueue(queue, options?.rootDir);
  const deduped = dedupeSource(doc.items, {
    ...item,
    id: item.id ?? "",
    dedupeKey: item.dedupeKey,
    createdAt: item.createdAt ?? "",
  } as CorpusQueueItem);
  const row: CorpusQueueItem = {
    ...item,
    id: item.id ?? randomUUID(),
    dedupeKey: item.dedupeKey.trim(),
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeQueue(queue, { ...doc, items: [row, ...deduped] }, options?.rootDir);
  return row;
}

export function rejectSource(item: CorpusQueueItem, reason: string, options?: { rootDir?: string }) {
  const rejected = readQueue("rejected", options?.rootDir);
  const row: CorpusQueueItem = {
    ...item,
    notes: [item.notes, reason].filter(Boolean).join(" | "),
    updatedAt: new Date().toISOString(),
  };
  writeQueue("rejected", { ...rejected, items: [row, ...dedupeSource(rejected.items, row)] }, options?.rootDir);
  recordCorpusPipelineEvent("source_rejected", {
    dedupeKey: item.dedupeKey,
    channelName: item.channelName,
    reason,
  });
}

export function promoteSource(
  item: CorpusQueueItem,
  from: CorpusQueueName,
  options?: { rootDir?: string }
) {
  const high = readQueue("high_priority", options?.rootDir);
  const cleaned = dedupeSource(high.items, item);
  const row: CorpusQueueItem = { ...item, updatedAt: new Date().toISOString() };
  writeQueue("high_priority", { ...high, items: [row, ...cleaned] }, options?.rootDir);

  if (from !== "high_priority") {
    const src = readQueue(from, options?.rootDir);
    writeQueue(
      from,
      {
        ...src,
        items: src.items.filter((i) => i.dedupeKey.trim().toLowerCase() !== item.dedupeKey.trim().toLowerCase()),
      },
      options?.rootDir
    );
  }

  recordCorpusPipelineEvent("source_promoted", {
    dedupeKey: item.dedupeKey,
    fromQueue: from,
    channelName: item.channelName,
  });
}

export function markIndexed(dedupeKey: string, videoId: string, options?: { rootDir?: string }) {
  for (const q of Object.keys(QUEUE_FILES) as CorpusQueueName[]) {
    const doc = readQueue(q, options?.rootDir);
    const next = doc.items.map((i) =>
      i.dedupeKey.trim().toLowerCase() === dedupeKey.trim().toLowerCase()
        ? { ...i, indexedVideoId: videoId, updatedAt: new Date().toISOString() }
        : i
    );
    writeQueue(q, { ...doc, items: next }, options?.rootDir);
  }
}

export function listQueue(name: CorpusQueueName, options?: { rootDir?: string }): CorpusQueueItem[] {
  return readQueue(name, options?.rootDir).items;
}

/** Append a user `source_index_request` shaped row to the requested queue (analytics hook). */
export function enqueueRequestedSource(
  input: {
    requestedUrl: string;
    topic?: string;
    sourceType?: string;
    surface?: string;
  },
  options?: { rootDir?: string }
) {
  const url = input.requestedUrl.trim();
  const dedupeKey = url.toLowerCase();
  const item: Omit<CorpusQueueItem, "id" | "createdAt"> = {
    dedupeKey,
    url,
    notes: [input.topic, input.sourceType, input.surface].filter(Boolean).join(" · "),
    requestedSurface: input.surface,
    category: input.topic,
    sourceType: input.sourceType,
  };
  enqueueSource("requested", item, options);
  recordCorpusPipelineEvent("source_request_received", {
    requestedUrl: url,
    topic: input.topic,
    sourceType: input.sourceType,
    surface: input.surface,
  });
}
