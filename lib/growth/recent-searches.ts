const STORAGE_KEY = "youtube-timestamp-search:recent-searches";
const MAX_ITEMS = 12;

export type RecentSearchItem = {
  phrase: string;
  savedAt: number;
};

function readRaw(): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const phrase = (row as { phrase?: string }).phrase?.trim() ?? "";
        const savedAt = Number((row as { savedAt?: number }).savedAt);
        if (!phrase || !Number.isFinite(savedAt)) return null;
        return { phrase, savedAt };
      })
      .filter(Boolean) as RecentSearchItem[];
  } catch {
    return [];
  }
}

function write(items: RecentSearchItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota / private mode
  }
}

export function getRecentSearches(): RecentSearchItem[] {
  return readRaw()
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_ITEMS);
}

export function recordRecentSearch(phrase: string) {
  const trimmed = phrase.trim();
  if (!trimmed) return;

  const next = readRaw().filter((item) => item.phrase.toLowerCase() !== trimmed.toLowerCase());
  next.unshift({ phrase: trimmed, savedAt: Date.now() });
  write(next);
}
