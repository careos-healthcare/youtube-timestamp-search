/**
 * Bounds expensive transcript corpus work during `next build` static generation.
 * Override with env when profiling or if CI machines need tighter limits.
 */

function isNpmBuildLifecycle(): boolean {
  return typeof process !== "undefined" && process.env.npm_lifecycle_event === "build";
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Max local transcript JSON files to open per keyword search (listCachedTranscripts order). */
export function maxLocalTranscriptVideosToScan(): number | undefined {
  const fromEnv = parsePositiveInt(process.env.NEXT_SEARCH_LOCAL_VIDEO_SCAN_CAP);
  if (fromEnv != null) return fromEnv;
  if (isNpmBuildLifecycle()) return 55;
  return undefined;
}

/** Max segment iterations per video during local keyword scan (long transcripts). */
export function maxSegmentsToScanPerVideo(): number | undefined {
  const fromEnv = parsePositiveInt(process.env.NEXT_SEARCH_SEGMENT_SCAN_CAP);
  if (fromEnv != null) return fromEnv;
  if (isNpmBuildLifecycle()) return 350;
  return undefined;
}

/** Max keyword / semantic candidate fetch size during build (passed into hybrid search). */
export function cappedHybridFetchSize(requested: number): number {
  const fromEnv = parsePositiveInt(process.env.NEXT_SEARCH_HYBRID_FETCH_CAP);
  if (fromEnv != null) return Math.min(requested, fromEnv);
  if (isNpmBuildLifecycle()) return Math.min(requested, 28);
  return requested;
}

/** Max transcripts to hydrate with getCachedTranscript in hybrid metadata enrichment. */
export function maxHybridMetadataEnrichVideos(): number | undefined {
  const fromEnv = parsePositiveInt(process.env.NEXT_SEARCH_ENRICH_VIDEO_CAP);
  if (fromEnv != null) return fromEnv;
  if (isNpmBuildLifecycle()) return 36;
  return undefined;
}
