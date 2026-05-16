/**
 * Stable public URLs for proven elite research topics (showcase validation).
 * Builds topic hubs from high-signal corpus matches when the auto index skips weak slugs (e.g. `rag`).
 */

import {
  getHighSignalTopicBySlug,
  matchMomentsToHighSignalTopic,
} from "@/lib/corpus/high-signal-topics";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { momentQualityRankingKey } from "@/lib/quality";

import { inferTopicPillar, normalizeIncomingTopicSlug } from "@/lib/topics/topic-slugs";
import type { TopicHub, TopicHubCreator, TopicHubVideo } from "@/lib/topics/topic-hub-types";

/** Must stay aligned with `ELITE_SHOWCASE_TOPIC_SLUGS` in elite-topic-showcase. */
export const ELITE_TOPIC_PAGE_SLUGS = ["rag", "statistics-for-ml"] as const;

export type EliteTopicPageSlug = (typeof ELITE_TOPIC_PAGE_SLUGS)[number];

export function isEliteTopicPageSlug(slug: string): slug is EliteTopicPageSlug {
  return (ELITE_TOPIC_PAGE_SLUGS as readonly string[]).includes(normalizeIncomingTopicSlug(slug));
}

function dedupeMoments(rows: PublicMomentRecord[]): PublicMomentRecord[] {
  const byId = new Map<string, PublicMomentRecord>();
  for (const m of rows) {
    const prev = byId.get(m.id);
    if (!prev || momentQualityRankingKey(m) > momentQualityRankingKey(prev)) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a));
}

function matchCreator(channelName?: string): TopicHubCreator | undefined {
  const ch = channelName?.trim();
  if (!ch) return undefined;
  return { slug: ch.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48), displayName: ch };
}

/** Materialize a topic hub for elite showcase slugs (≥3 matched moments). */
export function buildEliteTopicHub(rawSlug: string): TopicHub | undefined {
  const slug = normalizeIncomingTopicSlug(rawSlug);
  if (!isEliteTopicPageSlug(slug)) return undefined;

  const def = getHighSignalTopicBySlug(slug);
  if (!def) return undefined;

  const moments = dedupeMoments(matchMomentsToHighSignalTopic(def, loadPublicMoments()));
  if (moments.length < 3) return undefined;

  const semanticLike = moments.filter(
    (m) => (m.semantic?.extractionKinds?.length ?? 0) > 0 || m.phrase.trim().split(/\s+/).length >= 2
  ).length;
  const quality: TopicHub["quality"] =
    moments.length >= 5 || (moments.length >= 3 && semanticLike >= 2) ? "hub" : "thin";

  const videoMap = new Map<string, { title: string; channel?: string; count: number; best: number }>();
  for (const m of moments) {
    const title = m.videoTitle?.trim() || `Video ${m.videoId}`;
    const score = momentQualityRankingKey(m);
    const prev = videoMap.get(m.videoId);
    if (!prev) {
      videoMap.set(m.videoId, { title, channel: m.channelName, count: 1, best: score });
    } else {
      prev.count += 1;
      prev.best = Math.max(prev.best, score);
    }
  }

  const videos: TopicHubVideo[] = [...videoMap.entries()]
    .map(([videoId, v]) => ({
      videoId,
      title: v.title,
      channelName: v.channel,
      momentCount: v.count,
      bestScore: v.best,
    }))
    .sort((a, b) => b.momentCount * b.bestScore - a.momentCount * a.bestScore)
    .slice(0, 12);

  const creatorMap = new Map<string, TopicHubCreator>();
  for (const m of moments) {
    const c = matchCreator(m.channelName);
    if (c) creatorMap.set(c.slug, c);
  }

  const topSnippet = moments[0]?.snippet?.trim() ?? "";
  const description =
    topSnippet.length > 40
      ? `${def.label}: ${topSnippet.slice(0, 220).trim()}…`
      : `Research ${def.label} across indexed YouTube transcripts — compare explanations, citations, and timestamped moments.`;

  return {
    slug: def.canonicalSlug,
    displayTitle: def.label,
    description,
    quality,
    moments,
    videos,
    creators: [...creatorMap.values()].slice(0, 10),
    relatedTopicSlugs: def.topicHubSlugs.filter((s) => s !== def.canonicalSlug).slice(0, 10),
    relatedSearches: [def.primaryQuery, ...def.aliases].slice(0, 10),
    pillar: inferTopicPillar({ slug: def.canonicalSlug, displayTitle: def.label }),
  };
}

export function listEliteTopicPageSlugsForSitemap(): string[] {
  return ELITE_TOPIC_PAGE_SLUGS.filter((slug) => buildEliteTopicHub(slug) != null);
}
