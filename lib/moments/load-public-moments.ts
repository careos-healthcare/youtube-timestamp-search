import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PublicMomentRecord, PublicMomentsFile } from "@/lib/moments/public-moment-types";
import { computePublicMomentStableId, isPublicMomentId } from "@/lib/moments/stable-id";

let cached: PublicMomentRecord[] | null = null;

function readMomentsFromDisk(): PublicMomentRecord[] {
  const filePath = join(process.cwd(), "data/public-moments.json");
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as PublicMomentsFile | PublicMomentRecord[];
    const rows = Array.isArray(parsed) ? parsed : parsed.moments;
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is PublicMomentRecord => Boolean(row && typeof row.id === "string"));
  } catch {
    return [];
  }
}

/** All materialized public moments (small JSON; safe to read synchronously). */
export function loadPublicMoments(): PublicMomentRecord[] {
  if (cached) return cached;
  cached = readMomentsFromDisk();
  return cached;
}

export function getPublicMomentById(id: string): PublicMomentRecord | undefined {
  if (!isPublicMomentId(id)) return undefined;
  return loadPublicMoments().find((m) => m.id === id);
}

/** Drops cache so the next read reloads from disk (tests / dev hot reload). */
export function resetPublicMomentsCache() {
  cached = null;
}

/** Verifies stored id matches tuple (guards manual JSON edits). */
export function isPublicMomentRecordConsistent(row: PublicMomentRecord) {
  return row.id === computePublicMomentStableId(row.videoId, row.startSeconds, row.phrase);
}
