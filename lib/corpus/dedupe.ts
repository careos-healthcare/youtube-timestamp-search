import { normalizeText } from "@/lib/youtube";

/** Jaccard similarity on word sets (0–1). */
export function tokenJaccard(a: string, b: string): number {
  const ta = new Set(
    normalizeText(a)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const tb = new Set(
    normalizeText(b)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) {
    if (tb.has(w)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function titlesLikelyDuplicate(titleA: string, titleB: string, threshold = 0.55) {
  return tokenJaccard(titleA, titleB) >= threshold;
}

export type PhraseSaturation = {
  phrase: string;
  share: number;
  count: number;
};

/** Share of moments using the same normalized phrase within a topic bucket. */
export function phraseSaturationByTopic(
  topicKey: string,
  moments: Array<{ topic?: string; phrase: string }>
): PhraseSaturation[] {
  const rows = moments.filter((m) => (m.topic ?? "uncategorized") === topicKey);
  const total = rows.length;
  if (total === 0) return [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const p = normalizeText(r.phrase).toLowerCase().slice(0, 120);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count, share: count / total }))
    .sort((a, b) => b.share - a.share);
}

export function dedupeVideoTitles<T extends { videoTitle?: string; videoId: string }>(
  videos: T[],
  threshold = 0.58
): { keep: T[]; dropped: Array<{ reason: string; a: T; b: T }> } {
  const keep: T[] = [];
  const dropped: Array<{ reason: string; a: T; b: T }> = [];
  for (const v of videos) {
    const dup = keep.find(
      (k) =>
        k.videoId !== v.videoId &&
        titlesLikelyDuplicate(k.videoTitle ?? "", v.videoTitle ?? "", threshold)
    );
    if (dup) {
      dropped.push({
        reason: "Near-duplicate title vs kept row",
        a: dup,
        b: v,
      });
    } else {
      keep.push(v);
    }
  }
  return { keep, dropped };
}
