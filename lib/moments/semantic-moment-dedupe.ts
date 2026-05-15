import { normalizeText } from "@/lib/youtube";

/** Jaccard similarity on word sets (0–1). */
export function phraseTokenJaccard(a: string, b: string) {
  const ta = new Set(
    normalizeText(a)
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9']/g, ""))
      .filter(Boolean)
  );
  const tb = new Set(
    normalizeText(b)
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9']/g, ""))
      .filter(Boolean)
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const x of ta) if (tb.has(x)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

export function areNearDuplicateMoments(
  a: { videoId: string; startSeconds: number; phrase: string },
  b: { videoId: string; startSeconds: number; phrase: string },
  options?: { startEpsilonSeconds?: number; jaccardMin?: number }
): boolean {
  if (a.videoId !== b.videoId) return false;
  const eps = options?.startEpsilonSeconds ?? 4.5;
  if (Math.abs(a.startSeconds - b.startSeconds) > eps) return false;
  const j = phraseTokenJaccard(a.phrase, b.phrase);
  return j >= (options?.jaccardMin ?? 0.58);
}

export type DuplicateCluster = {
  representativePhrase: string;
  videoId: string;
  members: Array<{ phrase: string; startSeconds: number }>;
};

/** Greedy clustering for reporting (not persisted as stable ids). */
export function clusterNearDuplicatePhrases(
  rows: Array<{ videoId: string; startSeconds: number; phrase: string }>
): DuplicateCluster[] {
  const remaining = [...rows];
  const clusters: DuplicateCluster[] = [];
  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const members = [{ phrase: seed.phrase, startSeconds: seed.startSeconds }];
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const other = remaining[i]!;
      if (areNearDuplicateMoments(seed, other)) {
        members.push({ phrase: other.phrase, startSeconds: other.startSeconds });
        remaining.splice(i, 1);
      }
    }
    if (members.length >= 2) {
      clusters.push({
        representativePhrase: seed.phrase,
        videoId: seed.videoId,
        members,
      });
    }
  }
  return clusters;
}
