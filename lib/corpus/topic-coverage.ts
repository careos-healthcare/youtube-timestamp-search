import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import { evaluatePublicMoment } from "@/lib/quality";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import { evaluateSourceAuthorityForPublicMoment } from "@/lib/research/source-authority";
import { STATIC_PUBLIC_COLLECTIONS } from "@/lib/collections/static-collections";

import { phraseSaturationByTopic } from "./dedupe";

export type TopicCoverageRow = {
  topic: string;
  numberOfMoments: number;
  numberOfVideos: number;
  uniqueCreators: number;
  authorityDiversity: number;
  beginnerCoverage: number;
  technicalCoverage: number;
  counterpointCoverage: number;
  citationRichCoverage: number;
  collectionCoverage: number;
  /** Top repeated phrases (saturation risk). */
  topPhraseSaturation: { phrase: string; share: number }[];
  /** Heuristic: weak if low unique videos or low authority diversity. */
  weakComparisonDepth: boolean;
  missingBeginner: boolean;
  missingCounterpoint: boolean;
};

function topicKey(m: PublicMomentRecord) {
  return (m.topic ?? "uncategorized").trim() || "uncategorized";
}

export function buildTopicCoverageReport(moments: PublicMomentRecord[]): TopicCoverageRow[] {
  const byTopic = new Map<string, PublicMomentRecord[]>();
  for (const m of moments) {
    const k = topicKey(m);
    const list = byTopic.get(k) ?? [];
    list.push(m);
    byTopic.set(k, list);
  }

  const rows: TopicCoverageRow[] = [];

  for (const [topic, list] of byTopic.entries()) {
    const videoIds = new Set(list.map((m) => m.videoId));
    const creators = new Set(list.map((m) => m.channelName).filter(Boolean) as string[]);

    const authorities = new Set(
      list.map((m) => evaluateSourceAuthorityForPublicMoment(m).sourceAuthorityLabel)
    );

    let beginner = 0;
    let technical = 0;
    let counter = 0;
    let citeRich = 0;

    for (const m of list) {
      const cls = classifyExplanationFromText({
        phrase: m.phrase,
        snippet: m.snippet,
        videoTitle: m.videoTitle,
        extractionKinds: m.semantic?.extractionKinds,
      });
      if (cls.beginnerLikelihood >= 1 || cls.tutorialLikelihood >= 0.5) beginner += 1;
      if (cls.technicalLikelihood >= 1) technical += 1;
      if (cls.counterLikelihood >= 1) counter += 1;
      if (isPublicMomentCitationRich(m)) citeRich += 1;
    }

    const n = list.length;
    const sat = phraseSaturationByTopic(topic, list).slice(0, 3);

    const collectionHits = STATIC_PUBLIC_COLLECTIONS.filter((c) => c.relatedTopicSlugs.includes(topic)).length;

    rows.push({
      topic,
      numberOfMoments: n,
      numberOfVideos: videoIds.size,
      uniqueCreators: creators.size,
      authorityDiversity: authorities.size,
      beginnerCoverage: n ? beginner / n : 0,
      technicalCoverage: n ? technical / n : 0,
      counterpointCoverage: n ? counter / n : 0,
      citationRichCoverage: n ? citeRich / n : 0,
      collectionCoverage: collectionHits > 0 ? 1 : 0,
      topPhraseSaturation: sat.map((s) => ({ phrase: s.phrase, share: s.share })),
      weakComparisonDepth: videoIds.size < 2 || authorities.size < 2,
      missingBeginner: n >= 4 && beginner / n < 0.12,
      missingCounterpoint: n >= 6 && counter / n < 0.05,
    });
  }

  return rows.sort((a, b) => b.numberOfMoments - a.numberOfMoments);
}

export function averageQualityTierShare(moments: PublicMomentRecord[]) {
  const tiers = { high: 0, medium: 0, low: 0 };
  for (const m of moments) {
    const t = evaluatePublicMoment(m).qualityTier;
    tiers[t] += 1;
  }
  const n = moments.length || 1;
  return { high: tiers.high / n, medium: tiers.medium / n, low: tiers.low / n };
}
