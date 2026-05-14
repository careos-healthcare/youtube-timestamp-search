import { normalizeCategorySlug } from "@/lib/category-data";
import {
  buildCachedTranscriptPayload,
  hasCachedTranscript,
  saveTranscript,
  type CachedTranscript,
} from "@/lib/transcript-cache";
import {
  writeSupabaseTranscript,
  formatSupabaseWriteFailure,
} from "@/lib/transcript-cache-supabase";
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
  priority?: number;
};

export type SeedCsvValidationError = {
  line: number;
  message: string;
  preview?: string;
};

export type ParseSeedCsvResult = {
  rows: SeedTranscriptInput[];
  errors: SeedCsvValidationError[];
};

const REQUIRED_IDENTIFIER_HEADERS = ["url", "video_id", "videoid"] as const;
const OPTIONAL_CSV_HEADERS = ["category", "creator", "topic", "priority"] as const;
const MAX_METADATA_FIELD_LENGTH = 200;
const MIN_PRIORITY = 1;
const MAX_PRIORITY = 5;

export type SeedTranscriptStatus = "indexed" | "skipped" | "failed";

export type SeedTranscriptResult = {
  status: SeedTranscriptStatus;
  videoId: string;
  url?: string;
  category?: string;
  creator?: string;
  topic?: string;
  priority?: number;
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
  skipCacheCheck?: boolean;
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
  input: SeedTranscriptInput,
  options?: { skipCacheCheck?: boolean }
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
    priority: input.priority,
  };

  if (!options?.skipCacheCheck && (await hasCachedTranscript(videoId))) {
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

    const saved: CachedTranscript = await saveTranscript(
      videoId,
      {
        ...payload,
        videoUrl: url ?? payload.videoUrl,
        category: input.category ? normalizeCategorySlug(input.category) : undefined,
        topic: input.topic,
        creatorName: input.creator,
      },
      { skipSupabase: isSupabaseTranscriptStoreConfigured() }
    );

    if (isSupabaseTranscriptStoreConfigured()) {
      const persisted = await writeSupabaseTranscript(saved);
      if (!persisted.ok) {
        const reason = formatSupabaseWriteFailure(persisted);
        console.error(`[seed] Supabase persistence failed for ${videoId}: ${reason}`);
        return {
          ...base,
          status: "failed",
          reason: `Transcript fetched but Supabase persistence failed — ${reason}`,
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
    const result = await ingestSeedTranscript(input, {
      skipCacheCheck: options.skipCacheCheck,
    });
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

function isValidYouTubeVideoId(videoId: string) {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function validateMetadataField(
  fieldName: string,
  value: string | undefined,
  line: number,
  errors: SeedCsvValidationError[],
  preview: string
) {
  if (value == null || value.length === 0) {
    return undefined;
  }

  if (value.length > MAX_METADATA_FIELD_LENGTH) {
    errors.push({
      line,
      message: `${fieldName} exceeds ${MAX_METADATA_FIELD_LENGTH} characters`,
      preview,
    });
    return undefined;
  }

  return value;
}

function validatePriority(
  rawValue: string | undefined,
  line: number,
  errors: SeedCsvValidationError[],
  preview: string
): number | undefined {
  if (rawValue == null || rawValue.length === 0) {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < MIN_PRIORITY || parsed > MAX_PRIORITY) {
    errors.push({
      line,
      message: `priority must be an integer between ${MIN_PRIORITY} and ${MAX_PRIORITY}`,
      preview,
    });
    return undefined;
  }

  return parsed;
}

function validateSeedCsvHeaders(headers: string[], errors: SeedCsvValidationError[]) {
  const hasIdentifierColumn = REQUIRED_IDENTIFIER_HEADERS.some((header) =>
    headers.includes(header)
  );

  if (!hasIdentifierColumn) {
    errors.push({
      line: 1,
      message: `CSV header must include at least one of: ${REQUIRED_IDENTIFIER_HEADERS.join(", ")}`,
      preview: headers.join(","),
    });
  }

  const allowedHeaders = new Set<string>([
    ...REQUIRED_IDENTIFIER_HEADERS,
    ...OPTIONAL_CSV_HEADERS,
  ]);

  for (const header of headers) {
    if (!allowedHeaders.has(header)) {
      errors.push({
        line: 1,
        message: `Unknown CSV column "${header}". Allowed columns: ${[...allowedHeaders].join(", ")}`,
        preview: headers.join(","),
      });
    }
  }
}

function validateSeedCsvRow(
  record: Record<string, string>,
  line: number,
  errors: SeedCsvValidationError[],
  preview: string
): SeedTranscriptInput | null {
  const url = record.url?.trim() ?? "";
  const videoIdRaw = (record.video_id ?? record.videoid ?? "").trim();
  const hasUrl = url.length > 0;
  const hasVideoId = videoIdRaw.length > 0;

  if (!hasUrl && !hasVideoId) {
    errors.push({
      line,
      message: "Row must include a non-empty url or video_id",
      preview,
    });
    return null;
  }

  let resolvedVideoId: string | null = null;

  if (hasVideoId) {
    if (!isValidYouTubeVideoId(videoIdRaw)) {
      errors.push({
        line,
        message: `video_id must be exactly 11 YouTube characters (got "${videoIdRaw}")`,
        preview,
      });
    } else {
      resolvedVideoId = videoIdRaw;
    }
  }

  let resolvedUrlVideoId: string | null = null;
  if (hasUrl) {
    resolvedUrlVideoId = extractYouTubeVideoId(url);
    if (!resolvedUrlVideoId) {
      errors.push({
        line,
        message: `url is not a supported YouTube watch URL (got "${url}")`,
        preview,
      });
    }
  }

  if (
    resolvedVideoId &&
    resolvedUrlVideoId &&
    resolvedVideoId !== resolvedUrlVideoId
  ) {
    errors.push({
      line,
      message: `url and video_id disagree (${resolvedUrlVideoId} vs ${resolvedVideoId})`,
      preview,
    });
    return null;
  }

  const videoId = resolvedVideoId ?? resolvedUrlVideoId;
  if (!videoId) {
    return null;
  }

  const errorsBeforeMetadata = errors.length;

  const row: SeedTranscriptInput = {
    url: hasUrl ? url : undefined,
    videoId,
    category: validateMetadataField("category", record.category, line, errors, preview),
    creator: validateMetadataField("creator", record.creator, line, errors, preview),
    topic: validateMetadataField("topic", record.topic, line, errors, preview),
    priority: validatePriority(record.priority, line, errors, preview),
  };

  if (errors.length > errorsBeforeMetadata) {
    return null;
  }

  return row;
}

export function formatSeedCsvValidationErrors(errors: SeedCsvValidationError[]) {
  return errors
    .map((error) => {
      const preview = error.preview ? ` | row: ${error.preview}` : "";
      return `Line ${error.line}: ${error.message}${preview}`;
    })
    .join("\n");
}

export function parseSeedCsv(content: string): ParseSeedCsvResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [] };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const errors: SeedCsvValidationError[] = [];
  validateSeedCsvHeaders(headers, errors);

  const rows: SeedTranscriptInput[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const values = splitCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex]?.trim() ?? "";
    });

    if (headers.length !== values.length) {
      errors.push({
        line: lineNumber,
        message: `Expected ${headers.length} column(s) but found ${values.length}`,
        preview: line,
      });
      continue;
    }

    const row = validateSeedCsvRow(record, lineNumber, errors, line);
    if (row) {
      rows.push(row);
    }
  }

  const duplicateVideoIds = findDuplicateVideoIds(rows);
  for (const duplicate of duplicateVideoIds) {
    errors.push({
      line: duplicate.line,
      message: `Duplicate video_id "${duplicate.videoId}" also appears on line ${duplicate.firstLine}`,
      preview: duplicate.preview,
    });
  }

  return { rows, errors };
}

function findDuplicateVideoIds(rows: SeedTranscriptInput[]) {
  const seen = new Map<string, { line: number; preview: string }>();
  const duplicates: Array<{
    line: number;
    firstLine: number;
    videoId: string;
    preview: string;
  }> = [];

  rows.forEach((row, index) => {
    const videoId = row.videoId;
    if (!videoId) return;

    const line = index + 2;
    const preview = [row.url, row.videoId, row.category, row.creator, row.topic]
      .filter(Boolean)
      .join(",");

    const existing = seen.get(videoId);
    if (existing) {
      duplicates.push({
        line,
        firstLine: existing.line,
        videoId,
        preview,
      });
      return;
    }

    seen.set(videoId, { line, preview });
  });

  return duplicates;
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
    result.priority != null ? `priority=${result.priority}` : null,
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
