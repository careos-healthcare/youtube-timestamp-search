export type SearchLandingDiagnosticsSnapshot = {
  phrase: string;
  degraded: boolean;
  timeoutPhase?: string;
  queryComplexity: "broad" | "normal";
  searchMode?: string;
  momentCount: number;
  videoCount: number;
  at: string;
};

const MAX = 24;
const ring: SearchLandingDiagnosticsSnapshot[] = [];

export function recordSearchLandingDiagnostics(entry: Omit<SearchLandingDiagnosticsSnapshot, "at">) {
  const row: SearchLandingDiagnosticsSnapshot = {
    ...entry,
    at: new Date().toISOString(),
  };
  ring.unshift(row);
  if (ring.length > MAX) {
    ring.length = MAX;
  }
}

export function getSearchLandingDiagnosticsRecent(): SearchLandingDiagnosticsSnapshot[] {
  return [...ring];
}

export function getSearchLandingDiagnosticsLatest(): SearchLandingDiagnosticsSnapshot | null {
  return ring[0] ?? null;
}
