import { createHash } from "node:crypto";

import { normalizeText } from "@/lib/youtube";

/** Stable 20-char hex id for a (videoId, startSeconds, phrase) tuple. */
export function computePublicMomentStableId(videoId: string, startSeconds: number, phrase: string) {
  const normalizedPhrase = normalizeText(phrase).toLowerCase();
  const roundedStart = Math.round(startSeconds * 1000) / 1000;
  const body = `${videoId.trim()}|${roundedStart}|${normalizedPhrase}`;
  return createHash("sha256").update(body).digest("hex").slice(0, 20);
}

export function isPublicMomentId(value: string) {
  return /^[a-f0-9]{20}$/.test(value);
}
