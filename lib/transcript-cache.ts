import { promises as fs } from "node:fs";
import path from "node:path";

import {
  listSupabaseTranscripts,
  readSupabaseTranscript,
  searchSupabaseTranscripts,
  writeSupabaseTranscript,
} from "@/lib/transcript-cache-supabase";
import type { TranscriptLine } from "@/lib/transcript-types";
import { isSupabaseTranscriptStoreConfigured } from "@/lib/supabase";
import { formatTimestampFromMs, getYouTubeWatchUrl, normalizeText } from "@/lib/youtube";

export type CachedTranscriptSegment = {
  text: string;
  start: number;
  duration?: number;
};

export type CachedTranscript = {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  category?: string;
  topic?: string;
  creatorName?: string;
  fetchedAt: string;
  segments: CachedTranscriptSegment[];
};

export type CachedTranscriptSummary = {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  fetchedAt: string;
  segmentCount: number;
};

export type IndexedTranscriptSearchResult = {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  score: number;
  matches: Array<{
    start: number;
    timestamp: string;
    snippet: string;
    text: string;
  }>;
};

export type TranscriptCacheMode = "supabase" | "fallback";

type TranscriptCacheBackend = {
  read(videoId: string): Promise<CachedTranscript | null>;
  write(transcript: CachedTranscript): Promise<void>;
  list(): Promise<CachedTranscriptSummary[]>;
};

const globalForCache = globalThis as typeof globalThis & {
  __transcriptMemoryCache?: Map<string, CachedTranscript>;
};

function getMemoryStore(): Map<string, CachedTranscript> {
  if (!globalForCache.__transcriptMemoryCache) {
    globalForCache.__transcriptMemoryCache = new Map();
  }
  return globalForCache.__transcriptMemoryCache;
}

function normalizeVideoId(videoId: string) {
  return videoId.trim();
}

function toCachedSegments(lines: TranscriptLine[]): CachedTranscriptSegment[] {
  return lines.map((line) => ({
    text: line.text,
    start: line.start,
    duration: line.duration,
  }));
}

export function segmentsToTranscriptLines(segments: CachedTranscriptSegment[]): TranscriptLine[] {
  return segments.map((segment) => ({
    text: segment.text,
    start: segment.start,
    duration: segment.duration ?? 0,
  }));
}

function toSummary(transcript: CachedTranscript): CachedTranscriptSummary {
  return {
    videoId: transcript.videoId,
    videoUrl: transcript.videoUrl,
    title: transcript.title,
    channelName: transcript.channelName,
    fetchedAt: transcript.fetchedAt,
    segmentCount: transcript.segments.length,
  };
}

export function getTranscriptCacheMode(): TranscriptCacheMode {
  return isSupabaseTranscriptStoreConfigured() ? "supabase" : "fallback";
}

function getCacheDirectory() {
  return process.env.TRANSCRIPT_CACHE_DIR || path.join(process.cwd(), ".cache", "transcripts");
}

function createMemoryBackend(): TranscriptCacheBackend {
  const store = getMemoryStore();

  return {
    async read(videoId) {
      return store.get(normalizeVideoId(videoId)) ?? null;
    },
    async write(transcript) {
      store.set(normalizeVideoId(transcript.videoId), transcript);
    },
    async list() {
      return [...store.values()].map(toSummary).sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
    },
  };
}

function createFileBackend(): TranscriptCacheBackend | null {
  if (process.env.TRANSCRIPT_CACHE_DISABLE_FILE === "1") {
    return null;
  }

  const cacheDir = getCacheDirectory();

  return {
    async read(videoId) {
      try {
        const filePath = path.join(cacheDir, `${normalizeVideoId(videoId)}.json`);
        const raw = await fs.readFile(filePath, "utf8");
        return JSON.parse(raw) as CachedTranscript;
      } catch {
        return null;
      }
    },
    async write(transcript) {
      try {
        await fs.mkdir(cacheDir, { recursive: true });
        const filePath = path.join(cacheDir, `${normalizeVideoId(transcript.videoId)}.json`);
        await fs.writeFile(filePath, JSON.stringify(transcript, null, 2), "utf8");
      } catch {
        // File cache is best-effort only (e.g. read-only serverless filesystem).
      }
    },
    async list() {
      try {
        const entries = await fs.readdir(cacheDir);
        const summaries: CachedTranscriptSummary[] = [];

        for (const entry of entries) {
          if (!entry.endsWith(".json")) continue;
          try {
            const raw = await fs.readFile(path.join(cacheDir, entry), "utf8");
            const transcript = JSON.parse(raw) as CachedTranscript;
            summaries.push(toSummary(transcript));
          } catch {
            // Skip invalid cache files.
          }
        }

        return summaries.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
      } catch {
        return [];
      }
    },
  };
}

const memoryBackend = createMemoryBackend();
const fileBackend = createFileBackend();

function mergeSummaries(summaries: CachedTranscriptSummary[]) {
  const merged = new Map<string, CachedTranscriptSummary>();

  for (const summary of summaries) {
    const existing = merged.get(summary.videoId);
    if (!existing || summary.fetchedAt > existing.fetchedAt) {
      merged.set(summary.videoId, summary);
    }
  }

  return [...merged.values()].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}

export async function getCachedTranscript(videoId: string): Promise<CachedTranscript | null> {
  const normalizedId = normalizeVideoId(videoId);

  const fromMemory = await memoryBackend.read(normalizedId);
  if (fromMemory) {
    return fromMemory;
  }

  if (isSupabaseTranscriptStoreConfigured()) {
    const fromSupabase = await readSupabaseTranscript(normalizedId);
    if (fromSupabase) {
      await memoryBackend.write(fromSupabase);
      return fromSupabase;
    }
  }

  if (!fileBackend) {
    return null;
  }

  const fromFile = await fileBackend.read(normalizedId);
  if (fromFile) {
    await memoryBackend.write(fromFile);
  }

  return fromFile;
}

export async function hasCachedTranscript(videoId: string): Promise<boolean> {
  const cached = await getCachedTranscript(videoId);
  return cached !== null;
}

export async function saveTranscript(
  videoId: string,
  transcriptData: Omit<CachedTranscript, "videoId" | "fetchedAt"> & { fetchedAt?: string }
): Promise<CachedTranscript> {
  const normalizedId = normalizeVideoId(videoId);
  const payload: CachedTranscript = {
    videoId: normalizedId,
    videoUrl: transcriptData.videoUrl,
    title: transcriptData.title,
    channelName: transcriptData.channelName,
    category: transcriptData.category,
    topic: transcriptData.topic,
    creatorName: transcriptData.creatorName,
    fetchedAt: transcriptData.fetchedAt ?? new Date().toISOString(),
    segments: transcriptData.segments,
  };

  await memoryBackend.write(payload);

  if (isSupabaseTranscriptStoreConfigured()) {
    void writeSupabaseTranscript(payload);
  }

  if (fileBackend) {
    void fileBackend.write(payload);
  }

  return payload;
}

export async function listCachedTranscripts(): Promise<CachedTranscriptSummary[]> {
  const summaries: CachedTranscriptSummary[] = [];

  if (isSupabaseTranscriptStoreConfigured()) {
    summaries.push(...(await listSupabaseTranscripts()));
  }

  summaries.push(...(await memoryBackend.list()));

  if (fileBackend) {
    summaries.push(...(await fileBackend.list()));
  }

  return mergeSummaries(summaries);
}

function buildSnippet(segments: CachedTranscriptSegment[], index: number) {
  const start = Math.max(0, index - 1);
  const end = Math.min(segments.length - 1, index + 1);
  return normalizeText(
    segments
      .slice(start, end + 1)
      .map((segment) => segment.text)
      .join(" ")
  );
}

async function searchFallbackTranscripts(
  query: string,
  limit = 20
): Promise<IndexedTranscriptSearchResult[]> {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const summaries = await listCachedTranscripts();
  const results: IndexedTranscriptSearchResult[] = [];

  for (const summary of summaries) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached || cached.segments.length === 0) {
      continue;
    }

    const matches: IndexedTranscriptSearchResult["matches"] = [];
    let score = 0;

    for (let index = 0; index < cached.segments.length; index += 1) {
      const segment = cached.segments[index];
      const snippet = buildSnippet(cached.segments, index);
      const haystack = snippet.toLowerCase();

      const phraseHit = haystack.includes(normalizedQuery);
      const termHits = terms.filter((term) => haystack.includes(term)).length;
      if (!phraseHit && termHits === 0) {
        continue;
      }

      const matchScore = phraseHit ? 10 + termHits : termHits;
      score += matchScore;

      const previous = matches.at(-1);
      if (previous && Math.abs(previous.start - segment.start) < 3) {
        continue;
      }

      matches.push({
        start: segment.start,
        timestamp: formatTimestampFromMs(segment.start * 1000),
        snippet,
        text: segment.text,
      });

      if (matches.length >= 5) {
        break;
      }
    }

    if (matches.length === 0) {
      continue;
    }

    results.push({
      videoId: cached.videoId,
      videoUrl: cached.videoUrl || getYouTubeWatchUrl(cached.videoId),
      title: cached.title,
      channelName: cached.channelName,
      score,
      matches,
    });
  }

  return results
    .sort((left, right) => right.score - left.score || right.matches.length - left.matches.length)
    .slice(0, limit);
}

export async function searchCachedTranscripts(
  query: string,
  limit = 20
): Promise<IndexedTranscriptSearchResult[]> {
  if (isSupabaseTranscriptStoreConfigured()) {
    const supabaseResults = await searchSupabaseTranscripts(query, limit);
    if (supabaseResults.length > 0) {
      return supabaseResults;
    }
  }

  return searchFallbackTranscripts(query, limit);
}

export function buildCachedTranscriptPayload(
  videoId: string,
  lines: TranscriptLine[],
  metadata?: { title?: string; channelName?: string }
): Omit<CachedTranscript, "fetchedAt"> {
  return {
    videoId: normalizeVideoId(videoId),
    videoUrl: getYouTubeWatchUrl(videoId),
    title: metadata?.title,
    channelName: metadata?.channelName,
    segments: toCachedSegments(lines),
  };
}
