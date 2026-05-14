import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { parseSeedCsv } from "@/lib/seed-transcript-ingestion";
import {
  checkTranscriptAvailabilityBatch,
  deriveAvailabilityOutputPaths,
  formatAvailabilityResultLine,
  seedInputToCsvRecord,
  writeAvailabilityCsv,
} from "@/lib/transcript-availability-check";
import { SEED_CHANNEL_CATALOG, type SeedChannel } from "@/lib/seed-channel-catalog";
import { getYouTubeWatchUrl } from "@/lib/youtube";

export type GenerateSeedBatchOptions = {
  batchId: string;
  limit: number;
  categories?: string[];
  channelSlugs?: string[];
  dataDir?: string;
  verify?: boolean;
  delayMs?: number;
};

export type GenerateSeedBatchResult = {
  batchId: string;
  rawPath: string;
  availablePath: string;
  rejectedPath: string;
  candidateCount: number;
  availableCount?: number;
  unavailableCount?: number;
  verified: boolean;
};

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export function loadExcludedVideoIds(dataDir: string, ignorePaths: string[] = []) {
  const excluded = new Set<string>();
  const ignored = new Set(ignorePaths.map((path) => path.replace(/\\/g, "/")));

  if (!existsSync(dataDir)) {
    return excluded;
  }

  for (const fileName of readdirSync(dataDir)) {
    if (!fileName.endsWith(".csv")) continue;

    const absolutePath = join(dataDir, fileName).replace(/\\/g, "/");
    if (ignored.has(absolutePath)) continue;

    const content = readFileSync(join(dataDir, fileName), "utf8");
    const parsed = parseSeedCsv(content);
    for (const row of parsed.rows) {
      if (row.videoId) {
        excluded.add(row.videoId);
      }
    }
  }

  return excluded;
}

function filterChannels(
  channels: SeedChannel[],
  categories?: string[],
  channelSlugs?: string[]
) {
  const categorySet = categories?.map(normalizeCategory);
  const slugSet = channelSlugs?.map(normalizeSlug);

  return channels.filter((channel) => {
    if (categorySet?.length && !categorySet.includes(normalizeCategory(channel.category))) {
      return false;
    }

    if (slugSet?.length && !slugSet.includes(normalizeSlug(channel.slug))) {
      return false;
    }

    return true;
  });
}

export function generateSeedBatchCandidates(
  options: Pick<GenerateSeedBatchOptions, "limit" | "categories" | "channelSlugs" | "dataDir">
) {
  const dataDir = options.dataDir ?? join(process.cwd(), "data");
  const excluded = loadExcludedVideoIds(dataDir);
  const channels = filterChannels(
    SEED_CHANNEL_CATALOG,
    options.categories,
    options.channelSlugs
  );

  const queue = channels.map((channel) => ({
    channel,
    videos: channel.videos.filter((video) => !excluded.has(video.videoId)),
  }));

  const candidates: SeedTranscriptInput[] = [];
  let added = true;

  while (candidates.length < options.limit && added) {
    added = false;

    for (const entry of queue) {
      if (candidates.length >= options.limit) break;
      const next = entry.videos.shift();
      if (!next) continue;

      candidates.push({
        videoId: next.videoId,
        url: getYouTubeWatchUrl(next.videoId),
        category: entry.channel.category,
        creator: entry.channel.name,
        topic: next.topic,
        priority: next.priority,
      });
      added = true;
    }
  }

  return {
    candidates,
    excludedCount: excluded.size,
    channelCount: channels.length,
  };
}

export function buildSeedBatchPaths(dataDir: string, batchId: string) {
  const rawPath = join(dataDir, `seed-videos-raw-batch-${batchId}.csv`);
  const { availablePath, rejectedPath } = deriveAvailabilityOutputPaths(rawPath);
  return { rawPath, availablePath, rejectedPath };
}

export function writeRawSeedBatchCsv(filePath: string, candidates: SeedTranscriptInput[]) {
  const rows = candidates.map((candidate) => seedInputToCsvRecord(candidate));
  writeAvailabilityCsv(filePath, rows);
}

export async function generateVerifiedSeedBatch(
  options: GenerateSeedBatchOptions
): Promise<GenerateSeedBatchResult> {
  const dataDir = options.dataDir ?? join(process.cwd(), "data");
  const { rawPath, availablePath, rejectedPath } = buildSeedBatchPaths(dataDir, options.batchId);
  const { candidates } = generateSeedBatchCandidates(options);

  if (candidates.length === 0) {
    throw new Error(
      "No new catalog candidates found. Add videos to lib/seed-channel-catalog.ts or broaden filters."
    );
  }

  writeRawSeedBatchCsv(rawPath, candidates);

  if (!options.verify) {
    return {
      batchId: options.batchId,
      rawPath,
      availablePath,
      rejectedPath,
      candidateCount: candidates.length,
      verified: false,
    };
  }

  const summary = await checkTranscriptAvailabilityBatch(candidates, {
    delayMs: options.delayMs ?? 1500,
    onResult: (result, index, total) => {
      console.log(`${index}/${total} ${formatAvailabilityResultLine(result)}`);
    },
  });

  const availableRows = summary.results
    .filter((result) => result.available)
    .map((result) => seedInputToCsvRecord(result.input));

  const rejectedRows = summary.results
    .filter((result) => !result.available)
    .map((result) => ({
      ...seedInputToCsvRecord(result.input),
      reason: result.reason ?? "Transcript unavailable for this video.",
    }));

  writeAvailabilityCsv(availablePath, availableRows);
  writeAvailabilityCsv(rejectedPath, rejectedRows, ["reason"]);

  return {
    batchId: options.batchId,
    rawPath,
    availablePath,
    rejectedPath,
    candidateCount: candidates.length,
    availableCount: summary.available,
    unavailableCount: summary.unavailable,
    verified: true,
  };
}

export function formatGenerateBatchSummary(result: GenerateSeedBatchResult) {
  const lines = [
    "Seed batch generation summary",
    `batch: ${result.batchId}`,
    `raw: ${result.rawPath}`,
    `candidates: ${result.candidateCount}`,
  ];

  if (result.verified) {
    lines.push(`available: ${result.availablePath} (${result.availableCount ?? 0} rows)`);
    lines.push(`rejected: ${result.rejectedPath} (${result.unavailableCount ?? 0} rows)`);
    lines.push("");
    lines.push("Seed only the .available.csv file:");
    lines.push(`npm run seed:transcripts:csv -- ${result.availablePath}`);
  } else {
    lines.push("");
    lines.push("Run availability check before seeding:");
    lines.push(`npm run check:transcripts -- ${result.rawPath}`);
  }

  return lines.join("\n");
}
