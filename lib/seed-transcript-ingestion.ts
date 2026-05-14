import {
  buildCachedTranscriptPayload,
  hasCachedTranscript,
  saveTranscript,
  type CachedTranscript,
} from "@/lib/transcript-cache";
import { writeSupabaseTranscript } from "@/lib/transcript-cache-supabase";
import {
  fetchTranscriptFromYoutube,
  TranscriptFetchError,
} from "@/lib/transcript-service";
import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";
import { extractYouTubeVideoId, getYouTubeWatchUrl } from "@/lib/youtube";
import { fetchVideoOEmbedMetadata } from "@/lib/video-metadata";

export type SeedTranscriptInput = {
  videoId?: string;
  url?: string;
  category?: string;
  creator?: string;
  topic?: string;
};

export type SeedTranscriptStatus = "indexed" | "skipped" | "failed";

export type SeedTranscriptResult = {
  status: SeedTranscriptStatus;
  videoId: string;
  url?: string;
  category?: string;
  creator?: string;
  topic?: string;
  segmentCount?: number;
  title?: string;
  channelName?: string;
  reason?: string;
};

export type SeedTranscriptSummary = {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  results: SeedTranscriptResult[];
};

export type SeedTranscriptOptions = {
  delayMs?: number;
  onResult?: (result: SeedTranscriptResult, index: number, total: number) => void;
};

const DEFAULT_DELAY_MS = 1500;

export function resolveSeedVideoId(input: SeedTranscriptInput): string | null {
  const fromId = input.videoId?.trim();
  if (fromId && /^[a-zA-Z0-9_-]{11}$/.test(fromId)) {
    return fromId;
  }

  if (input.url) {
    return extractYouTubeVideoId(input.url);
  }

  if (fromId) {
    return extractYouTubeVideoId(fromId) ?? (fromId.length >= 6 ? fromId : null);
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestSeedTranscript(
  input: SeedTranscriptInput
): Promise<SeedTranscriptResult> {
  const videoId = resolveSeedVideoId(input);
  const url = input.url ?? (videoId ? getYouTubeWatchUrl(videoId) : undefined);

  if (!videoId) {
    return {
      status: "failed",
      videoId: input.videoId ?? input.url ?? "unknown",
      url,
      category: input.category,
      creator: input.creator,
      topic: input.topic,
      reason: "Invalid or missing video ID / URL",
    };
  }

  const base = {
    videoId,
    url,
    category: input.category,
    creator: input.creator,
    topic: input.topic,
  };

  if (await hasCachedTranscript(videoId)) {
    return {
      ...base,
      status: "skipped",
      reason: "Already indexed in cache",
    };
  }

  try {
    const lines = await fetchTranscriptFromYoutube(videoId);
    const metadata = await fetchVideoOEmbedMetadata(videoId);
    const payload = buildCachedTranscriptPayload(videoId, lines, {
      title: metadata.title,
      channelName: input.creator ?? metadata.channelName,
    });

    const saved: CachedTranscript = await saveTranscript(videoId, {
      ...payload,
      videoUrl: url ?? payload.videoUrl,
    });

    if (isSupabaseTranscriptStoreConfigured()) {
      const persisted = await writeSupabaseTranscript(saved);
      if (!persisted) {
        return {
          ...base,
          status: "failed",
          reason: "Transcript fetched but Supabase persistence failed",
        };
      }
    }

    return {
      ...base,
      status: "indexed",
      segmentCount: lines.length,
      title: saved.title,
      channelName: saved.channelName,
    };
  } catch (error) {
    const reason =
      error instanceof TranscriptFetchError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown ingestion error";

    return {
      ...base,
      status: "failed",
      reason,
    };
  }
}

export async function ingestSeedTranscripts(
  inputs: SeedTranscriptInput[],
  options: SeedTranscriptOptions = {}
): Promise<SeedTranscriptSummary> {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const results: SeedTranscriptResult[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const result = await ingestSeedTranscript(input);
    results.push(result);
    options.onResult?.(result, index + 1, inputs.length);

    if (index < inputs.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {
    total: results.length,
    indexed: results.filter((result) => result.status === "indexed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}

export function parseSeedCsv(content: string): SeedTranscriptInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const rows: SeedTranscriptInput[] = [];

  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() ?? "";
    });

    const row: SeedTranscriptInput = {
      url: record.url || undefined,
      videoId: record.video_id || record.videoid || undefined,
      category: record.category || undefined,
      creator: record.creator || undefined,
      topic: record.topic || undefined,
    };

    if (row.url || row.videoId) {
      rows.push(row);
    }
  }

  return rows;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function parseSeedCliArgs(argv: string[]): SeedTranscriptInput[] {
  const inputs: SeedTranscriptInput[] = [];

  for (const arg of argv) {
    const trimmed = arg.trim();
    if (!trimmed || trimmed.startsWith("-")) continue;

    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
      inputs.push({ url: trimmed });
      continue;
    }

    inputs.push({ videoId: trimmed });
  }

  return inputs;
}

export function formatSeedResultLine(result: SeedTranscriptResult) {
  const tags = [
    result.category ? `category=${result.category}` : null,
    result.creator ? `creator=${result.creator}` : null,
    result.topic ? `topic=${result.topic}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const details = [
    result.segmentCount != null ? `${result.segmentCount} segments` : null,
    result.title ? `"${result.title}"` : null,
    result.reason ? result.reason : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `[${result.status.toUpperCase()}] ${result.videoId}${tags ? ` (${tags})` : ""}${details ? ` — ${details}` : ""}`;
}

export function formatSeedSummary(summary: SeedTranscriptSummary) {
  return [
    "Seed transcript summary",
    `total: ${summary.total}`,
    `indexed: ${summary.indexed}`,
    `skipped: ${summary.skipped}`,
    `failed: ${summary.failed}`,
  ].join("\n");
}
