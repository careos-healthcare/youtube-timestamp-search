export interface TranscriptSearchResult {
  offsetMs: number;
  timestamp: string;
  snippet: string;
  openUrl: string;
}

function isSupportedYouTubeHost(hostname: string) {
  return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname);
}

function normalizeVideoId(videoId: string | null | undefined) {
  const normalized = videoId?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (!isSupportedYouTubeHost(hostname)) {
    return null;
  }

  if (hostname === "youtu.be") {
    return normalizeVideoId(parsedUrl.pathname.split("/").filter(Boolean)[0]);
  }

  if (parsedUrl.pathname === "/watch") {
    return normalizeVideoId(parsedUrl.searchParams.get("v"));
  }

  if (parsedUrl.pathname.startsWith("/shorts/")) {
    return normalizeVideoId(parsedUrl.pathname.split("/").filter(Boolean)[1]);
  }

  if (parsedUrl.pathname.startsWith("/embed/")) {
    return normalizeVideoId(parsedUrl.pathname.split("/").filter(Boolean)[1]);
  }

  return null;
}

export function getYouTubeWatchUrl(videoId: string, seconds?: number): string {
  const normalizedVideoId = videoId.trim();
  const watchUrl = new URL("https://www.youtube.com/watch");
  watchUrl.searchParams.set("v", normalizedVideoId);

  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    watchUrl.searchParams.set("t", `${Math.floor(seconds)}s`);
  }

  return watchUrl.toString();
}

// Backwards-compatible alias for the existing search route.
export function extractVideoId(input: string) {
  return extractYouTubeVideoId(input);
}

export function formatTimestampFromMs(offsetMs: number) {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildYouTubeTimestampUrl(videoId: string, offsetMs: number) {
  return getYouTubeWatchUrl(videoId, offsetMs / 1000);
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
