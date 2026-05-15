export type VideoPageDiagnosticsSnapshot = {
  videoId: string;
  segmentCount: number;
  loadDurationMs: number;
  timedOut: boolean;
  fallbackReason?: string | null;
  at: string;
};

const MAX = 24;
const ring: VideoPageDiagnosticsSnapshot[] = [];

export function recordVideoPageDiagnostics(
  entry: Omit<VideoPageDiagnosticsSnapshot, "at">
) {
  const row: VideoPageDiagnosticsSnapshot = {
    ...entry,
    at: new Date().toISOString(),
  };
  ring.unshift(row);
  if (ring.length > MAX) {
    ring.length = MAX;
  }
}

export function getVideoPageDiagnosticsRecent(): VideoPageDiagnosticsSnapshot[] {
  return [...ring];
}

export function getVideoPageDiagnosticsLatest(): VideoPageDiagnosticsSnapshot | null {
  return ring[0] ?? null;
}
