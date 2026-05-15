/** Server-side budget for loading transcript-derived blocks on `/video/[id]`. */
export function readVideoPageDataBudgetMs(): number {
  const raw = typeof process !== "undefined" ? process.env.VIDEO_PAGE_DATA_BUDGET_MS : undefined;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 2000 && n <= 55000) return Math.floor(n);
  }
  if (typeof process !== "undefined" && process.env.VERCEL === "1") {
    return 11000;
  }
  return 22000;
}

/** Max transcript segments fetched from store (Supabase limit / slice). */
export function readVideoPageMaxTranscriptSegments(): number {
  const raw = typeof process !== "undefined" ? process.env.VIDEO_PAGE_MAX_TRANSCRIPT_SEGMENTS : undefined;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 200) return Math.min(Math.floor(n), 15000);
  }
  return 2000;
}

/** Cap segments passed into keyword/moment extractors (CPU-bound). */
export function readVideoPageProcessingSegmentCap(): number {
  const raw = typeof process !== "undefined" ? process.env.VIDEO_PAGE_PROCESSING_SEGMENT_CAP : undefined;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 150) return Math.min(Math.floor(n), 8000);
  }
  return 1200;
}
