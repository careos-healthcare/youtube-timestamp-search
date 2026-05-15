import { trackPersistentEvent } from "@/lib/analytics";

const PREFIX = "youtube-timestamp-search:growth:";
const KEYS = {
  searches: `${PREFIX}session-searches`,
  resultClicks: `${PREFIX}session-result-clicks`,
  timestampClicks: `${PREFIX}session-timestamp-clicks`,
  digestDismissed: `${PREFIX}digest-dismissed-session`,
  digestSubmitted: `${PREFIX}digest-submitted`,
} as const;

function readInt(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function writeInt(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, String(value));
}

export function incrementSessionSearches(): number {
  const next = readInt(KEYS.searches) + 1;
  writeInt(KEYS.searches, next);
  return next;
}

export function incrementResultClicks(): number {
  const next = readInt(KEYS.resultClicks) + 1;
  writeInt(KEYS.resultClicks, next);
  return next;
}

export function incrementTimestampClicks(): number {
  const next = readInt(KEYS.timestampClicks) + 1;
  writeInt(KEYS.timestampClicks, next);
  return next;
}

export function getSessionSearchCount() {
  return readInt(KEYS.searches);
}

export function getSessionTimestampClickCount() {
  return readInt(KEYS.timestampClicks);
}

export function shouldShowEmailDigestPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(KEYS.digestSubmitted) === "1") return false;
  if (window.sessionStorage.getItem(KEYS.digestDismissed) === "1") return false;
  const searches = readInt(KEYS.searches);
  const ts = readInt(KEYS.timestampClicks);
  return searches >= 3 || ts >= 2;
}

export function markDigestDismissedSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEYS.digestDismissed, "1");
}

export function markDigestSubmitted() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEYS.digestSubmitted, "1");
}

export function milestoneKey(name: string) {
  return `${PREFIX}milestone:${name}`;
}

export function tryMarkMilestoneOnce(name: string): boolean {
  if (typeof window === "undefined") return false;
  const key = milestoneKey(name);
  if (window.sessionStorage.getItem(key) === "1") return false;
  window.sessionStorage.setItem(key, "1");
  return true;
}

export function recordTimestampClickMilestone(payload: { query?: string; videoId?: string }) {
  if (typeof window === "undefined") return;
  const depth = incrementTimestampClicks();
  for (const n of [1, 2, 5] as const) {
    if (depth === n && tryMarkMilestoneOnce(`session_timestamp_${n}`)) {
      trackPersistentEvent("search_depth_milestone", {
        milestone: `timestamp_clicks_${n}`,
        depth: n,
        query: payload.query,
        videoId: payload.videoId,
      });
    }
  }
}
