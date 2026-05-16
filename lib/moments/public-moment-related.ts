import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { momentQualityRankingKey } from "@/lib/quality";
import { normalizeText } from "@/lib/youtube";

function scoreRelated(a: PublicMomentRecord, b: PublicMomentRecord) {
  if (a.id === b.id) return -1;
  let score = 0;
  if (a.videoId === b.videoId) score += 5;
  const pa = normalizeText(a.phrase).toLowerCase();
  const pb = normalizeText(b.phrase).toLowerCase();
  if (pa && pa === pb) score += 4;
  else if (pa && pb && (pa.includes(pb) || pb.includes(pa))) score += 2;
  if (a.channelName && b.channelName && a.channelName === b.channelName) score += 1;
  return score;
}

/** Cheap related list: same video first, then same phrase, then channel; capped, deterministic. */
export function getRelatedPublicMoments(
  current: PublicMomentRecord,
  all: PublicMomentRecord[],
  limit = 6
): PublicMomentRecord[] {
  const others = all.filter((m) => m.id !== current.id);
  const scored = others
    .map((m) => ({ m, s: scoreRelated(current, m) }))
    .filter((row) => row.s > 0)
    .sort((x, y) => {
      if (y.s !== x.s) return y.s - x.s;
      return x.m.id.localeCompare(y.m.id);
    })
    .map((row) => row.m);

  const out: PublicMomentRecord[] = [];
  const seen = new Set<string>();
  for (const m of scored) {
    if (out.length >= limit) break;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }

  if (out.length < limit) {
    for (const m of others.sort((a, b) => a.id.localeCompare(b.id))) {
      if (out.length >= limit) break;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }

  return out
    .slice(0, limit)
    .sort((a, b) => {
      const rel = scoreRelated(current, b) - scoreRelated(current, a);
      if (rel !== 0) return rel;
      return momentQualityRankingKey(b) - momentQualityRankingKey(a);
    });
}
