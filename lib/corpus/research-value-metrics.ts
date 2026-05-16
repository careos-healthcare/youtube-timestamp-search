import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import { evaluatePublicMoment } from "@/lib/quality";

export type ResearchValueMetrics = {
  citationsPerTranscriptHour: number | null;
  acceptedMomentsPerTranscriptHour: number | null;
  semanticMomentsPerTranscriptHour: number | null;
  /** Pairs of moments in same non-generic topic (capped per topic) — proxy for compare UI. */
  compareViewOpportunities: number;
  /** Proxy for internal topic graph / related-topic surfacing. */
  topicLinkOpportunities: number;
};

export function computeResearchValueMetricsForMoments(
  moments: PublicMomentRecord[],
  transcriptHours: number | null
): ResearchValueMetrics {
  const h = transcriptHours != null && transcriptHours > 0 ? transcriptHours : null;
  let citations = 0;
  let accepted = 0;
  let semantic = 0;
  const topicCounts = new Map<string, number>();

  for (const m of moments) {
    if (isPublicMomentCitationRich(m)) citations += 1;
    if (evaluatePublicMoment(m).qualityTier !== "low") accepted += 1;
    if ((m.semantic?.extractionKinds?.length ?? 0) > 0) semantic += 1;
    const t = (m.topic ?? "uncategorized").trim() || "uncategorized";
    topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  }

  let compareViewOpportunities = 0;
  for (const [topic, n] of topicCounts) {
    if (topic === "uncategorized" || n < 2) continue;
    compareViewOpportunities += Math.min(10, (n * (n - 1)) / 2);
  }

  const distinctTopics = [...topicCounts.keys()].filter((t) => t !== "uncategorized").length;
  const topicLinkOpportunities = Math.round(
    distinctTopics * Math.min(6, 1 + Math.log2(moments.length + 1))
  );

  return {
    citationsPerTranscriptHour: h != null ? citations / h : null,
    acceptedMomentsPerTranscriptHour: h != null ? accepted / h : null,
    semanticMomentsPerTranscriptHour: h != null ? semantic / h : null,
    compareViewOpportunities,
    topicLinkOpportunities,
  };
}
