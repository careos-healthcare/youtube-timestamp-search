import { CREATOR_DATABASE } from "@/lib/creator-data";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

import type {
  TopicHub,
  TopicHubCreator,
  TopicHubQuality,
  TopicHubVideo,
  TopicIndexBuildStats,
  TopicPillar,
} from "@/lib/topics/topic-hub-types";
import {
  inferTopicPillar,
  isWeakTopicSlug,
  normalizeIncomingTopicSlug,
  slugifyTopicLabel,
} from "@/lib/topics/topic-slugs";

type Accum = {
  slug: string;
  displayTitle: string;
  moments: PublicMomentRecord[];
  categorySlug?: string;
};

let hubCache: Map<string, TopicHub> | null = null;
let hubListCache: TopicHub[] | null = null;
let buildStats: TopicIndexBuildStats | null = null;

export function resetTopicHubIndexCache() {
  hubCache = null;
  hubListCache = null;
  buildStats = null;
}

function momentHubScore(m: PublicMomentRecord): number {
  const wc = m.phrase.trim().split(/\s+/).filter(Boolean).length;
  const semanticBoost = (m.semantic?.extractionKinds?.length ?? 0) * 8;
  const rank = m.semantic?.totalSemanticRank ?? 0;
  const multi = wc >= 2 ? 22 : 0;
  const qs = m.qualityScore ?? 0;
  return qs + semanticBoost + multi + rank * 0.12;
}

function matchCreator(channelName?: string): TopicHubCreator | undefined {
  const ch = channelName?.trim().toLowerCase();
  if (!ch) return undefined;
  for (const c of CREATOR_DATABASE) {
    if (c.displayName.toLowerCase() === ch) {
      return { slug: c.slug, displayName: c.displayName };
    }
    if (c.aliases.some((a) => a.toLowerCase() === ch)) {
      return { slug: c.slug, displayName: c.displayName };
    }
    if (c.displayName.length > 4 && ch.includes(c.displayName.toLowerCase())) {
      return { slug: c.slug, displayName: c.displayName };
    }
  }
  return undefined;
}

function dedupeMoments(rows: PublicMomentRecord[]) {
  const byId = new Map<string, PublicMomentRecord>();
  for (const m of rows) {
    const prev = byId.get(m.id);
    if (!prev || momentHubScore(m) > momentHubScore(prev)) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => momentHubScore(b) - momentHubScore(a));
}

function finalizeHub(acc: Accum, allSlugs: Map<string, Accum>): TopicHub | null {
  const moments = dedupeMoments(acc.moments);
  if (moments.length < 2) return null;
  if (isWeakTopicSlug(acc.slug, acc.displayTitle)) return null;

  const semanticLike = moments.filter(
    (m) => (m.semantic?.extractionKinds?.length ?? 0) > 0 || m.phrase.trim().split(/\s+/).length >= 2
  ).length;

  const quality: TopicHubQuality =
    moments.length >= 5 || (moments.length >= 3 && semanticLike >= 2) ? "hub" : "thin";

  const videoMap = new Map<string, { title: string; channel?: string; count: number; best: number }>();
  for (const m of moments) {
    const title = m.videoTitle?.trim() || `Video ${m.videoId}`;
    const prev = videoMap.get(m.videoId);
    const score = momentHubScore(m);
    if (!prev) {
      videoMap.set(m.videoId, {
        title,
        channel: m.channelName,
        count: 1,
        best: score,
      });
    } else {
      prev.count += 1;
      prev.best = Math.max(prev.best, score);
      if (!prev.channel && m.channelName) prev.channel = m.channelName;
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
  const creators = [...creatorMap.values()].slice(0, 10);

  const vidSet = new Set(moments.map((m) => m.videoId));
  const overlap: { slug: string; score: number }[] = [];
  for (const [otherSlug, otherAcc] of allSlugs) {
    if (otherSlug === acc.slug) continue;
    let s = 0;
    for (const m of otherAcc.moments) {
      if (vidSet.has(m.videoId)) s += 1;
    }
    if (s > 0) overlap.push({ slug: otherSlug, score: s });
  }
  overlap.sort((a, b) => b.score - a.score);
  const relatedTopicSlugs = overlap
    .map((o) => o.slug)
    .filter((s) => !isWeakTopicSlug(s, s.replace(/-/g, " ")))
    .slice(0, 10);

  const relatedSearches = [
    ...new Set(
      moments
        .slice(0, 12)
        .map((m) => m.phrase.trim())
        .filter((p) => p.length >= 6)
    ),
  ].slice(0, 10);

  const topSnippet = moments[0]?.snippet?.trim() ?? "";
  const description =
    topSnippet.length > 40
      ? `${acc.displayTitle}: ${topSnippet.slice(0, 220).trim()}…`
      : `Research ${acc.displayTitle} across indexed YouTube transcripts — timestamped moments, videos, and related searches.`;

  const pillar = inferTopicPillar({
    slug: acc.slug,
    displayTitle: acc.displayTitle,
    categorySlug: acc.categorySlug,
  });

  return {
    slug: acc.slug,
    displayTitle: acc.displayTitle,
    description,
    quality,
    categorySlug: acc.categorySlug,
    moments,
    videos,
    creators,
    relatedTopicSlugs,
    relatedSearches,
    pillar,
  };
}

export function buildTopicHubsFromMoments(
  moments: PublicMomentRecord[]
): { hubs: Map<string, TopicHub>; stats: TopicIndexBuildStats } {
  const bySlug = new Map<string, Accum>();
  const rejectedWeakLabels: string[] = [];

  const touch = (slug: string, title: string, m: PublicMomentRecord, cat?: string) => {
    const display = title.trim();
    if (!display) return;
    if (isWeakTopicSlug(slug, display)) {
      if (!rejectedWeakLabels.includes(display)) rejectedWeakLabels.push(display);
      return;
    }
    let acc = bySlug.get(slug);
    if (!acc) {
      acc = { slug, displayTitle: display, moments: [], categorySlug: cat };
      bySlug.set(slug, acc);
    }
    acc.moments.push(m);
    if (cat && !acc.categorySlug) acc.categorySlug = cat;
  };

  for (const m of moments) {
    const cat = m.category;
    const primary = m.semantic?.topics.primaryTopic?.trim() || m.topic?.trim();
    if (primary) {
      const slug = slugifyTopicLabel(primary);
      touch(slug, primary, m, cat);
    }
    const secondaries = m.semantic?.topics.secondaryTopics ?? [];
    for (const s of secondaries.slice(0, 3)) {
      const label = s.trim();
      if (label.length < 4) continue;
      const slug = slugifyTopicLabel(label);
      touch(slug, label, m, cat);
    }
    const concepts = m.semantic?.topics.relatedConcepts ?? [];
    for (const c of concepts.slice(0, 4)) {
      const label = c.trim();
      if (label.length < 5) continue;
      const slug = slugifyTopicLabel(label);
      touch(slug, label.charAt(0).toUpperCase() + label.slice(1), m, cat);
    }
    const wc = m.phrase.trim().split(/\s+/).filter(Boolean).length;
    if (wc >= 2 && wc <= 8) {
      const slug = slugifyTopicLabel(m.phrase);
      touch(slug, m.phrase, m, cat);
    }
    const ch = m.channelName?.trim();
    if (ch && ch.length > 2) {
      const slug = slugifyTopicLabel(`creator ${ch}`);
      touch(slug, ch, m, cat);
    }
    if (cat) {
      const slug = `category-${slugifyTopicLabel(cat)}`;
      touch(slug, cat.replace(/-/g, " "), m, cat);
    }
  }

  const hubs = new Map<string, TopicHub>();
  let thin = 0;
  let hub = 0;
  for (const acc of bySlug.values()) {
    const row = finalizeHub(acc, bySlug);
    if (!row) continue;
    hubs.set(row.slug, row);
    if (row.quality === "thin") thin += 1;
    else hub += 1;
  }

  return {
    hubs,
    stats: {
      hubCount: hub,
      thinCount: thin,
      rejectedWeakLabels: rejectedWeakLabels.slice(0, 400),
    },
  };
}

function ensureBuilt() {
  if (!hubCache || !hubListCache || !buildStats) {
    const { hubs, stats } = buildTopicHubsFromMoments(loadPublicMoments());
    hubCache = hubs;
    hubListCache = [...hubs.values()].sort((a, b) => {
      if (a.quality !== b.quality) return a.quality === "hub" ? -1 : 1;
      return b.moments.length - a.moments.length;
    });
    buildStats = stats;
  }
}

export function getTopicHubBySlug(rawSlug: string): TopicHub | undefined {
  const slug = normalizeIncomingTopicSlug(rawSlug);
  ensureBuilt();
  return hubCache!.get(slug);
}

export function listTopicHubs(): TopicHub[] {
  ensureBuilt();
  return hubListCache ?? [];
}

export function getTopicIndexBuildStats(): TopicIndexBuildStats {
  ensureBuilt();
  return buildStats!;
}

export function listTopicHubSlugsForSitemap(): string[] {
  return listTopicHubs()
    .filter((h) => h.quality === "hub" && h.moments.length >= 3)
    .map((h) => h.slug);
}

export function getTopicHubsByPillar(limitPerPillar = 10): Record<TopicPillar, TopicHub[]> {
  const pillars: TopicPillar[] = ["ai", "coding", "startups", "productivity", "education", "other"];
  const out: Record<TopicPillar, TopicHub[]> = {
    ai: [],
    coding: [],
    startups: [],
    productivity: [],
    education: [],
    other: [],
  };
  const ranked = listTopicHubs().filter((h) => h.quality === "hub");
  for (const p of pillars) {
    out[p] = ranked.filter((h) => h.pillar === p).slice(0, limitPerPillar);
  }
  return out;
}
