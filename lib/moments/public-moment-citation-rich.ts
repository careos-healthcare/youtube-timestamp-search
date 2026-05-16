import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

/** True when semantic citations include markdown or academic strings (research-grade cite hooks). */
export function isPublicMomentCitationRich(m: PublicMomentRecord): boolean {
  const s = m.semantic;
  if (!s?.citations) return false;
  return Boolean(s.citations.markdown?.length || s.citations.academic?.length);
}
