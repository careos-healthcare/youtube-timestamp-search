import { writeFileSync } from "node:fs";

import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { resolveSeedVideoId } from "@/lib/seed-transcript-ingestion";
import {
  fetchTranscriptFromYoutube,
  TranscriptFetchError,
} from "@/lib/transcript-service";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type TranscriptAvailabilityResult = {
  videoId: string;
  available: boolean;
  segmentCount?: number;
  reason?: string;
  input: SeedTranscriptInput;
};

export type TranscriptAvailabilitySummary = {
  total: number;
  available: number;
  unavailable: number;
  results: TranscriptAvailabilityResult[];
};

export type TranscriptAvailabilityOptions = {
  delayMs?: number;
  onResult?: (result: TranscriptAvailabilityResult, index: number, total: number) => void;
};

const DEFAULT_DELAY_MS = 1500;

const OUTPUT_COLUMNS = ["url", "video_id", "category", "creator", "topic", "priority"] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function seedInputToCsvRecord(input: SeedTranscriptInput): Record<string, string> {
  const videoId = input.videoId ?? resolveSeedVideoId(input) ?? "";

  return {
    url: input.url ?? (videoId ? getYouTubeWatchUrl(videoId) : ""),
    video_id: videoId,
    category: input.category ?? "",
    creator: input.creator ?? "",
    topic: input.topic ?? "",
    priority: input.priority != null ? String(input.priority) : "",
  };
}

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAvailabilityCsv(
  rows: Record<string, string>[],
  extraColumns: string[] = []
) {
  const columns = [...OUTPUT_COLUMNS, ...extraColumns];
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","));
  }

  return `${lines.join("\n")}\n`;
}

export function writeAvailabilityCsv(
  filePath: string,
  rows: Record<string, string>[],
  extraColumns: string[] = []
) {
  writeFileSync(filePath, buildAvailabilityCsv(rows, extraColumns), "utf8");
}

export async function checkTranscriptAvailability(
  input: SeedTranscriptInput
): Promise<TranscriptAvailabilityResult> {
  const videoId = resolveSeedVideoId(input);

  if (!videoId) {
    return {
      videoId: input.videoId ?? input.url ?? "unknown",
      available: false,
      reason: "Invalid or missing video ID / URL",
      input,
    };
  }

  try {
    const lines = await fetchTranscriptFromYoutube(videoId);
    return {
      videoId,
      available: true,
      segmentCount: lines.length,
      input,
    };
  } catch (error) {
    const reason =
      error instanceof TranscriptFetchError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Transcript unavailable for this video.";

    return {
      videoId,
      available: false,
      reason,
      input,
    };
  }
}

export async function checkTranscriptAvailabilityBatch(
  inputs: SeedTranscriptInput[],
  options: TranscriptAvailabilityOptions = {}
): Promise<TranscriptAvailabilitySummary> {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const results: TranscriptAvailabilityResult[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const result = await checkTranscriptAvailability(input);
    results.push(result);
    options.onResult?.(result, index + 1, inputs.length);

    if (index < inputs.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {
    total: results.length,
    available: results.filter((result) => result.available).length,
    unavailable: results.filter((result) => !result.available).length,
    results,
  };
}

export function formatAvailabilityResultLine(result: TranscriptAvailabilityResult) {
  const status = result.available ? "AVAILABLE" : "UNAVAILABLE";
  const details = result.available
    ? `${result.segmentCount ?? 0} segments`
    : result.reason ?? "Unknown error";
  return `[${status}] ${result.videoId} — ${details}`;
}

export function formatAvailabilitySummary(summary: TranscriptAvailabilitySummary) {
  return [
    "Transcript availability summary",
    `total: ${summary.total}`,
    `available: ${summary.available}`,
    `unavailable: ${summary.unavailable}`,
  ].join("\n");
}

export function deriveAvailabilityOutputPaths(inputPath: string) {
  const normalized = inputPath.replace(/\.csv$/i, "");
  return {
    availablePath: `${normalized}.available.csv`,
    rejectedPath: `${normalized}.rejected.csv`,
  };
}
