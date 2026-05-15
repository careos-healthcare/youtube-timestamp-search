const STORAGE_KEY = "youtube-timestamp-search:saved-clips";
const MAX_CLIPS = 200;

export type SavedClip = {
  id: string;
  query: string;
  videoId: string;
  title: string;
  channel?: string;
  timestamp: string;
  snippet: string;
  youtubeUrl: string;
  momentPageUrl: string;
  createdAt: string;
};

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(): SavedClip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is SavedClip => Boolean(row && typeof row === "object" && "id" in row));
  } catch {
    return [];
  }
}

function write(clips: SavedClip[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clips.slice(0, MAX_CLIPS)));
  } catch {
    // ignore
  }
}

export function getSavedClips(): SavedClip[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function isClipSaved(videoId: string, youtubeUrl: string): boolean {
  return readAll().some((c) => c.videoId === videoId && c.youtubeUrl === youtubeUrl);
}

export type SaveClipInput = Omit<SavedClip, "id" | "createdAt">;

export function saveClip(input: SaveClipInput): SavedClip | null {
  const trimmedQuery = input.query.trim();
  if (!trimmedQuery || !input.videoId.trim()) return null;

  const clip: SavedClip = {
    ...input,
    query: trimmedQuery,
    id: randomId(),
    createdAt: new Date().toISOString(),
  };

  const existing = readAll().filter(
    (c) => !(c.videoId === clip.videoId && c.youtubeUrl === clip.youtubeUrl)
  );
  existing.unshift(clip);
  write(existing);
  return clip;
}

export function removeSavedClip(id: string) {
  write(readAll().filter((c) => c.id !== id));
}

export function exportSavedClipsMarkdown(clips: SavedClip[]): string {
  return clips
    .map(
      (c) =>
        `### ${c.title} (${c.timestamp})\n` +
        `> ${c.snippet.replace(/\n+/g, " ")}\n\n` +
        `- [YouTube](${c.youtubeUrl})\n` +
        `- [Moment page](${c.momentPageUrl})\n` +
        `- Query: “${c.query}”\n`
    )
    .join("\n");
}

export function exportSavedTimestampLinks(clips: SavedClip[]): string {
  return clips.map((c) => c.youtubeUrl).join("\n");
}
