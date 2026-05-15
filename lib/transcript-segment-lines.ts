import type { TranscriptLine } from "@/lib/transcript-types";

/** Minimal segment shape for converting cached segments to transcript lines (no fs / cache). */
export type TranscriptSegmentInput = {
  text: string;
  start: number;
  duration?: number;
};

export function segmentsToTranscriptLines(segments: TranscriptSegmentInput[]): TranscriptLine[] {
  return segments.map((segment) => ({
    text: segment.text,
    start: segment.start,
    duration: segment.duration ?? 0,
  }));
}
