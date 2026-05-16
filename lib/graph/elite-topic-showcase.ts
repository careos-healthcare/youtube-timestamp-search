/**
 * Elite topic showcase validation — RAG + statistics-for-ML public research surfaces.
 * Report-only; no UI or ingest.
 */

import { buildSocialPostFormats, type ShareChannel } from "@/lib/clip-distribution";
import { buildMomentCitationBundle } from "@/lib/citations";
import { STATIC_PUBLIC_COLLECTIONS } from "@/lib/collections/static-collections";
import {
  getHighSignalTopicBySlug,
  listHighSignalTopics,
  matchMomentsToHighSignalTopic,
  type HighSignalTopicDefinition,
} from "@/lib/corpus/high-signal-topics";
import {
  buildResearchGradeTopicReport,
  type TopicResearchGradeRow,
} from "@/lib/corpus/topic-research-grade";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { buildTrackedPublicMomentPageUrl, buildTrackedShareUrl } from "@/lib/og-urls";
import { momentQualityRankingKey } from "@/lib/quality";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import {
  compareExplanationRankingKeyPublic,
  comparePublicMomentsForTopic,
  type CompareExplanationPublicRow,
} from "@/lib/research/compare-explanations";
import { RESEARCH_SESSION_ANALYTICS_EVENTS } from "@/lib/research/research-session";
import {
  evaluateSourceAuthorityForPublicMoment,
  type SourceAuthorityLabel,
} from "@/lib/research/source-authority";
import { isTopicKeyword } from "@/lib/topic-keywords";
import { ELITE_TOPIC_PAGE_SLUGS, isEliteTopicPageSlug } from "@/lib/topics/elite-topic-pages";
import { getTopicHubBySlug } from "@/lib/topics/topic-index";
import {
  buildCollectionPath,
  buildPublicMomentUrl,
  buildTopicPath,
  getSiteUrl,
} from "@/lib/seo";

import { buildTopicDeepeningFromDisk, type TopicDeepeningAnalysis } from "./topic-deepening";

export const ELITE_SHOWCASE_TOPIC_SLUGS = ELITE_TOPIC_PAGE_SLUGS;

export type EliteShowcaseMomentRef = {
  id: string;
  canonicalSlug: string;
  phrase: string;
  snippet: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  timestamp: string;
  youtubeUrl: string;
  canonicalUrl: string;
  authorityLabel: SourceAuthorityLabel;
  qualityTier: "high" | "medium" | "low";
  citationRich: boolean;
};

export type EliteShowcaseComparePair = {
  labelA: string;
  labelB: string;
  momentA: EliteShowcaseMomentRef;
  momentB: EliteShowcaseMomentRef;
  contrast: string;
};

export type EliteShowcaseCollectionRef =
  | { kind: "linked"; slug: string; title: string; url: string; momentCount: number }
  | {
      kind: "gap";
      recommendedSlug: string;
      title: string;
      reason: string;
    };

export type EliteShowcaseDistribution = {
  topicUrl: string;
  topicUrlTracked: Record<ShareChannel, string>;
  top3MomentUrls: string[];
  citationUrls: { canonical: string; youtube: string; tracked: Record<ShareChannel, string> };
  shareCitationPrompt: string;
  social: { redditTitle: string; redditBody: string; hackerNewsTitle: string; xPost: string };
};

export type EliteTopicShowcaseEntry = {
  canonicalSlug: string;
  label: string;
  primaryQuery: string;
  vertical: string;
  publicTopicUrl: string;
  topicPage: {
    hubSlug: string | null;
    hubQuality: "hub" | "thin" | null;
    hubMomentCount: number;
    curatedSeedKeyword: boolean;
    eliteTopicPage: boolean;
    pageReachable: boolean;
    gapNote: string | null;
  };
  collection: EliteShowcaseCollectionRef;
  researchGrade: {
    tier: TopicResearchGradeRow["tier"];
    researchGradeScore: number;
    topicTrustScore: number;
    momentCount: number;
    citationDensity: number;
    compareDepth: number;
    shallowAuthorityShare: number;
    distanceToElite: number;
  };
  graphPlanner: {
    status: TopicDeepeningAnalysis["status"];
    reason: string;
    weakContextShare: number;
    graphMomentCount: number;
  };
  bestMoments: EliteShowcaseMomentRef[];
  curated: {
    beginner: EliteShowcaseMomentRef | null;
    technical: EliteShowcaseMomentRef | null;
    citationReady: EliteShowcaseMomentRef | null;
    comparePair: EliteShowcaseComparePair | null;
  };
  sourceContextMix: Array<{ label: SourceAuthorityLabel; count: number; share: number }>;
  trustCaveats: string[];
  showcaseReadyWhy: string[];
  weaknesses: string[];
  distribution: EliteShowcaseDistribution;
};

export type ResearchSessionTestPlan = {
  flow: string[];
  expectedAnalyticsEvents: string[];
  legacySurfaceEvents: string[];
  successThresholds: Array<{ metric: string; threshold: string; rationale: string }>;
};

export type EliteTopicShowcaseReport = {
  generatedAt: string;
  milestone: string;
  siteUrl: string;
  topics: EliteTopicShowcaseEntry[];
  pageRepresentationGaps: string[];
  researchSessionTestPlan: ResearchSessionTestPlan;
};

function rankMoments(moments: PublicMomentRecord[]): PublicMomentRecord[] {
  return [...moments].sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a));
}

function toMomentRef(m: PublicMomentRecord): EliteShowcaseMomentRef {
  const authority = evaluateSourceAuthorityForPublicMoment(m);
  const q = momentQualityRankingKey(m);
  const qualityTier: "high" | "medium" | "low" = q >= 55 ? "high" : q >= 35 ? "medium" : "low";
  return {
    id: m.id,
    canonicalSlug: m.canonicalSlug,
    phrase: m.phrase,
    snippet: m.snippet,
    videoId: m.videoId,
    videoTitle: m.videoTitle?.trim() || m.videoId,
    channelName: m.channelName?.trim() || "Unknown channel",
    timestamp: m.timestamp,
    youtubeUrl: m.youtubeUrl,
    canonicalUrl: buildPublicMomentUrl(m.id, m.canonicalSlug),
    authorityLabel: authority.sourceAuthorityLabel,
    qualityTier,
    citationRich: isPublicMomentCitationRich(m),
  };
}

function pickBeginner(moments: PublicMomentRecord[], queryLabel: string): PublicMomentRecord | null {
  let best: { m: PublicMomentRecord; score: number } | null = null;
  for (const m of moments) {
    const cls = classifyExplanationFromText({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    });
    const score = cls.beginnerLikelihood + cls.tutorialLikelihood * 0.5;
    if (!best || score > best.score) best = { m, score };
  }
  return best && best.score >= 0.5 ? best.m : rankMoments(moments)[0] ?? null;
}

function pickTechnical(moments: PublicMomentRecord[], queryLabel: string): PublicMomentRecord | null {
  let best: { m: PublicMomentRecord; score: number } | null = null;
  for (const m of moments) {
    const cls = classifyExplanationFromText({
      phrase: queryLabel,
      snippet: m.snippet,
      videoTitle: m.videoTitle,
      extractionKinds: m.semantic?.extractionKinds,
    });
    const score = cls.technicalLikelihood;
    if (!best || score > best.score) best = { m, score };
  }
  return best && best.score >= 0.5 ? best.m : rankMoments(moments)[1] ?? rankMoments(moments)[0] ?? null;
}

function pickCitationReady(moments: PublicMomentRecord[]): PublicMomentRecord | null {
  const rich = rankMoments(moments.filter(isPublicMomentCitationRich));
  return rich[0] ?? rankMoments(moments)[0] ?? null;
}

function pickComparePair(
  rows: CompareExplanationPublicRow[]
): EliteShowcaseComparePair | null {
  if (rows.length < 2) return null;
  const sorted = [...rows].sort(compareExplanationRankingKeyPublic);
  const a = sorted[0]!;
  let b = sorted.find((r) => r.framing !== a.framing && r.moment.videoId !== a.moment.videoId);
  if (!b) b = sorted[1]!;
  return {
    labelA: a.differentiation,
    labelB: b.differentiation,
    momentA: toMomentRef(a.moment),
    momentB: toMomentRef(b.moment),
    contrast: `${a.framing} vs ${b.framing} across different videos/creators`,
  };
}

function resolveCollection(def: HighSignalTopicDefinition): EliteShowcaseCollectionRef {
  const linked = STATIC_PUBLIC_COLLECTIONS.find(
    (c) =>
      c.relatedTopicSlugs.includes(def.canonicalSlug) ||
      c.slug.includes(def.canonicalSlug.replace(/-for-ml$/, "")) ||
      (def.canonicalSlug === "rag" && c.slug === "best-rag-explanations")
  );
  if (linked) {
    const site = getSiteUrl();
    return {
      kind: "linked",
      slug: linked.slug,
      title: linked.title,
      url: `${site}${buildCollectionPath(linked.slug)}`,
      momentCount: linked.momentIds.length,
    };
  }
  const recommendedSlug =
    def.canonicalSlug === "statistics-for-ml"
      ? "statistics-for-ml-explanations"
      : `${def.canonicalSlug}-explanations`;
  return {
    kind: "gap",
    recommendedSlug,
    title: `Best ${def.label} explanations (indexed clips)`,
    reason:
      "No static public collection links this topic slug yet; topic hub + compare still work. Add a curated collection when distribution needs a second landing surface.",
  };
}

function sourceContextMix(moments: PublicMomentRecord[]) {
  const counts = new Map<SourceAuthorityLabel, number>();
  for (const m of moments) {
    const label = evaluateSourceAuthorityForPublicMoment(m).sourceAuthorityLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = moments.length || 1;
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

function trackedTopicUrls(topicUrl: string): Record<ShareChannel, string> {
  const channels: ShareChannel[] = ["twitter", "reddit", "hackernews"];
  const out = {} as Record<ShareChannel, string>;
  for (const source of channels) {
    out[source] = buildTrackedShareUrl(topicUrl, {
      source,
      medium: "social",
      campaign: "search",
      content: "topic-hub",
    });
  }
  return out;
}

function buildDistribution(
  def: HighSignalTopicDefinition,
  topicUrl: string,
  topMoments: EliteShowcaseMomentRef[],
  citationMoment: EliteShowcaseMomentRef | null
): EliteShowcaseDistribution {
  const cite = citationMoment ?? topMoments[0];
  const tracked: Record<ShareChannel, string> = cite
    ? {
        twitter: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "twitter", "social"),
        reddit: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "reddit", "social"),
        hackernews: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "hackernews", "social"),
        embed: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "embed", "embed"),
        copy: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "copy", "copy"),
        generic: buildTrackedPublicMomentPageUrl(cite.id, cite.canonicalSlug, "generic", "social"),
      }
  : {
      twitter: topicUrl,
      reddit: topicUrl,
      hackernews: topicUrl,
      embed: topicUrl,
      copy: topicUrl,
      generic: topicUrl,
    };

  const bundle = cite
    ? buildMomentCitationBundle(getSiteUrl(), {
        momentId: cite.id,
        canonicalSlug: cite.canonicalSlug,
        videoId: cite.videoId,
        phrase: cite.phrase,
        snippet: cite.snippet,
        videoTitle: cite.videoTitle,
        channelName: cite.channelName,
        timestamp: cite.timestamp,
        youtubeUrl: cite.youtubeUrl,
      })
    : null;

  const shareCitationPrompt = bundle
    ? bundle.plainText
    : `Research topic: ${def.label}\nHub: ${topicUrl}`;

  const social = cite
    ? buildSocialPostFormats(
        {
          kind: "moment",
          title: cite.phrase,
          quote: cite.snippet.slice(0, 280),
          timestampUrl: cite.youtubeUrl,
          pageUrl: cite.canonicalUrl,
          videoTitle: cite.videoTitle,
          channelName: cite.channelName,
          timestampLabel: cite.timestamp,
        },
        { pageUrlWithUtm: tracked.twitter }
      )
    : buildSocialPostFormats({
        kind: "search",
        title: def.primaryQuery,
        quote: def.label,
        timestampUrl: topicUrl,
        pageUrl: topicUrl,
      });

  return {
    topicUrl,
    topicUrlTracked: trackedTopicUrls(topicUrl),
    top3MomentUrls: topMoments.slice(0, 3).map((m) => m.canonicalUrl),
    citationUrls: {
      canonical: bundle?.canonicalMomentUrl ?? cite?.canonicalUrl ?? topicUrl,
      youtube: bundle?.youtubeTimestampUrl ?? cite?.youtubeUrl ?? topicUrl,
      tracked,
    },
    shareCitationPrompt,
    social,
  };
}

function buildShowcaseReadyWhy(
  row: TopicResearchGradeRow,
  deepening: TopicDeepeningAnalysis | undefined
): string[] {
  const why: string[] = [];
  if (row.tier === "elite") why.push(`Research-grade **elite** (score ${row.metrics.researchGradeScore}).`);
  if (row.failedRequirements.length === 0) why.push("Passes high-signal trust requirements.");
  if (row.metrics.citationDensity >= 0.5) {
    why.push(`Citation density ${(row.metrics.citationDensity * 100).toFixed(0)}% — export-friendly.`);
  }
  if (row.metrics.compareDepth >= 2) {
    why.push(`Compare depth ${row.metrics.compareDepth} distinct videos/creators.`);
  }
  if (deepening?.status === "ready_to_showcase") {
    why.push("Graph planner: **ready_to_showcase**.");
  }
  if (row.metrics.momentCount >= 20) {
    why.push(`${row.metrics.momentCount} indexed moments — enough for browse + compare.`);
  }
  return why;
}

function buildWeaknesses(
  row: TopicResearchGradeRow,
  deepening: TopicDeepeningAnalysis | undefined,
  collection: EliteShowcaseCollectionRef,
  pageGap: string | null
): string[] {
  const weak: string[] = [];
  if (pageGap) weak.push(pageGap);
  if (collection.kind === "gap") weak.push(collection.reason);
  if (deepening && deepening.status !== "ready_to_showcase") {
    weak.push(
      `Graph status **${deepening.status}** — ${deepening.reason} (weak context ${(deepening.metrics.weakContextShare * 100).toFixed(0)}%).`
    );
  }
  if (row.metrics.shallowAuthorityShare > 0.2) {
    weak.push(
      `Shallow-authority share ${(row.metrics.shallowAuthorityShare * 100).toFixed(0)}% — label clips before citing.`
    );
  }
  if (row.metrics.topicTrustScore < 75) {
    weak.push(`Topic trust ${row.metrics.topicTrustScore}/100 — below ideal showcase bar.`);
  }
  if (row.metrics.semanticExplanationRatio < 0.35) {
    weak.push("Semantic explanation ratio still thin for some moments.");
  }
  return weak;
}

function buildTrustCaveats(row: TopicResearchGradeRow, matched: PublicMomentRecord[]): string[] {
  const caveats = [
    "Heuristic transcript index — not verified papers, docs, or official RAG/ML curricula.",
    "Source authority labels are automated; listen to the segment before citing.",
  ];
  if (row.metrics.conversationalShare > 0.05) {
    caveats.push(
      `${(row.metrics.conversationalShare * 100).toFixed(0)}% of matched moments skew conversational/opinion-heavy.`
    );
  }
  const podcasts = matched.filter((m) =>
    /podcast|interview|conversation/i.test(`${m.videoTitle ?? ""} ${m.channelName ?? ""}`)
  ).length;
  if (podcasts > 0 && podcasts / (matched.length || 1) > 0.15) {
    caveats.push("Mix includes podcast/interview framing — weaker than tutorial primary sources.");
  }
  return caveats;
}

function buildResearchSessionTestPlan(): ResearchSessionTestPlan {
  return {
    flow: [
      "Open production site (or staging) in a clean browser profile with analytics instrumentation enabled.",
      "Navigate to `/topic/rag` or `/topic/statistics-for-ml` (or search `what is rag` / `statistics for machine learning` and land on topic hub).",
      "Scroll **Compare explanations** — open at least two contrasting rows (beginner vs technical if available).",
      "Save one moment to the local library (saved clips).",
      "Copy citation (plain or markdown) from the citation-ready moment card.",
      "Click a **related topic** chip or internal link to a neighbor hub (e.g. transformers, probability).",
      "Open **Saved** / library and revisit the saved clip (same tab session).",
    ],
    expectedAnalyticsEvents: [...RESEARCH_SESSION_ANALYTICS_EVENTS],
    legacySurfaceEvents: [
      "topic_page_view",
      "topic_moment_click",
      "topic_related_click",
      "compare_explanations_view",
      "compare_explanation_click",
      "research_compare_used",
      "moment_citation_copy",
      "citation_workflow_completed",
      "saved_clip",
      "first_clip_saved",
      "saved_research_return",
      "research_chain_depth",
      "repeat_topic_research",
    ],
    successThresholds: [
      {
        metric: "researchDepthScore (session)",
        threshold: "≥ 60",
        rationale: "Researcher cohort per RESEARCH_WORKFLOW_METRICS.md",
      },
      {
        metric: "compare + citation in same session",
        threshold: "both events fired",
        rationale: "Evidence of compare-then-cite workflow",
      },
      {
        metric: "topicChainLength",
        threshold: "≥ 2",
        rationale: "User followed related topic, not single-page bounce",
      },
      {
        metric: "citation_workflow_completed",
        threshold: "≥ 1 per session",
        rationale: "Export behavior vs passive scroll",
      },
      {
        metric: "saved_research_return",
        threshold: "≥ 1 after saved_clip",
        rationale: "Local library revisit within session",
      },
      {
        metric: "repeat_researcher cohort share (aggregate)",
        threshold: "> 10% of instrumented sessions",
        rationale: "Product pull bar from RESEARCH_WORKFLOW_METRICS.md",
      },
    ],
  };
}

function buildTopicEntry(
  def: HighSignalTopicDefinition,
  moments: PublicMomentRecord[],
  gradeRow: TopicResearchGradeRow,
  deepening: TopicDeepeningAnalysis | undefined
): EliteTopicShowcaseEntry {
  const matched = matchMomentsToHighSignalTopic(def, moments);
  const ranked = rankMoments(matched);
  const bestMoments = ranked.slice(0, 5).map(toMomentRef);
  const beginner = pickBeginner(matched, def.primaryQuery);
  const technical = pickTechnical(matched, def.primaryQuery);
  const citationReady = pickCitationReady(matched);
  const compareRows = comparePublicMomentsForTopic(matched, def.primaryQuery, 6);
  const comparePair = pickComparePair(compareRows);

  const hub = getTopicHubBySlug(def.canonicalSlug);
  const seed = isTopicKeyword(def.canonicalSlug);
  const elitePage = isEliteTopicPageSlug(def.canonicalSlug);
  const pageReachable = Boolean(hub || seed);
  let gapNote: string | null = null;
  if (!pageReachable) {
    gapNote = `/topic/${def.canonicalSlug} has fewer than 3 matched corpus moments — page may 404.`;
  } else if (hub && hub.quality === "thin") {
    gapNote = `Topic hub quality=thin (${hub.moments.length} moments) — compare/citation still render; SEO may noindex.`;
  } else if (elitePage && !seed) {
    gapNote = null;
  }

  const site = getSiteUrl();
  const publicTopicUrl = `${site}${buildTopicPath(def.canonicalSlug)}`;
  const collection = resolveCollection(def);

  const distribution = buildDistribution(
    def,
    publicTopicUrl,
    bestMoments,
    citationReady ? toMomentRef(citationReady) : null
  );

  return {
    canonicalSlug: def.canonicalSlug,
    label: def.label,
    primaryQuery: def.primaryQuery,
    vertical: def.vertical,
    publicTopicUrl,
    topicPage: {
      hubSlug: hub?.slug ?? null,
      hubQuality: hub?.quality ?? null,
      hubMomentCount: hub?.moments.length ?? 0,
      curatedSeedKeyword: seed,
      eliteTopicPage: elitePage,
      pageReachable,
      gapNote,
    },
    collection,
    researchGrade: {
      tier: gradeRow.tier,
      researchGradeScore: gradeRow.metrics.researchGradeScore,
      topicTrustScore: gradeRow.metrics.topicTrustScore,
      momentCount: gradeRow.metrics.momentCount,
      citationDensity: gradeRow.metrics.citationDensity,
      compareDepth: gradeRow.metrics.compareDepth,
      shallowAuthorityShare: gradeRow.metrics.shallowAuthorityShare,
      distanceToElite: gradeRow.distanceToElite,
    },
    graphPlanner: {
      status: deepening?.status ?? "deepen_next",
      reason: deepening?.reason ?? "Topic deepening analysis unavailable.",
      weakContextShare: deepening?.metrics.weakContextShare ?? 0,
      graphMomentCount: deepening?.metrics.graphMomentCount ?? gradeRow.metrics.momentCount,
    },
    bestMoments,
    curated: {
      beginner: beginner ? toMomentRef(beginner) : null,
      technical: technical ? toMomentRef(technical) : null,
      citationReady: citationReady ? toMomentRef(citationReady) : null,
      comparePair,
    },
    sourceContextMix: sourceContextMix(matched),
    trustCaveats: buildTrustCaveats(gradeRow, matched),
    showcaseReadyWhy: buildShowcaseReadyWhy(gradeRow, deepening),
    weaknesses: buildWeaknesses(gradeRow, deepening, collection, gapNote),
    distribution,
  };
}

export function buildEliteTopicShowcaseReport(moments: PublicMomentRecord[]): EliteTopicShowcaseReport {
  const researchGrade = buildResearchGradeTopicReport(moments);
  const gradeBySlug = new Map(researchGrade.topics.map((t) => [t.canonicalSlug, t]));

  let deepeningAnalyses: TopicDeepeningAnalysis[] = [];
  try {
    deepeningAnalyses = buildTopicDeepeningFromDisk(moments).analyses;
  } catch {
    deepeningAnalyses = [];
  }
  const deepeningBySlug = new Map(deepeningAnalyses.map((a) => [a.topicSlug, a]));

  const topics: EliteTopicShowcaseEntry[] = [];
  for (const slug of ELITE_SHOWCASE_TOPIC_SLUGS) {
    const def = getHighSignalTopicBySlug(slug) ?? listHighSignalTopics().find((d) => d.canonicalSlug === slug);
    const gradeRow = gradeBySlug.get(slug);
    if (!def || !gradeRow) continue;
    topics.push(buildTopicEntry(def, moments, gradeRow, deepeningBySlug.get(slug)));
  }

  const pageRepresentationGaps = topics
    .filter((t) => t.topicPage.gapNote || t.collection.kind === "gap")
    .map((t) => {
      const parts = [t.canonicalSlug];
      if (t.topicPage.gapNote) parts.push(t.topicPage.gapNote);
      if (t.collection.kind === "gap") {
        parts.push(`Collection gap: recommend \`${t.collection.recommendedSlug}\`.`);
      }
      return parts.join(" — ");
    });

  return {
    generatedAt: new Date().toISOString(),
    milestone:
      "Validate whether real users experience RAG and statistics-for-ML as meaningfully better than YouTube/Google for research — not add another elite topic.",
    siteUrl: getSiteUrl(),
    topics,
    pageRepresentationGaps,
    researchSessionTestPlan: buildResearchSessionTestPlan(),
  };
}

function momentRefMd(m: EliteShowcaseMomentRef): string {
  return `**${m.phrase}** — ${m.channelName} · \`${m.timestamp}\` · [moment](${m.canonicalUrl}) (${m.authorityLabel})`;
}

export function formatEliteTopicShowcaseMarkdown(report: EliteTopicShowcaseReport): string {
  const lines: string[] = [
    "# Elite topic showcase validation",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.milestone,
    "",
    "## Summary",
    "",
    `- Site: ${report.siteUrl}`,
    `- Showcase topics: **${report.topics.map((t) => t.label).join("**, **")}**`,
    "",
  ];

  if (report.pageRepresentationGaps.length) {
    lines.push("## Page representation gaps (document only — no UI in this milestone)", "");
    for (const g of report.pageRepresentationGaps) lines.push(`- ${g}`);
    lines.push("");
  }

  for (const t of report.topics) {
    lines.push(`## ${t.label} (\`${t.canonicalSlug}\`)`, "");
    lines.push(`- **Topic URL:** ${t.publicTopicUrl}`);
    if (t.collection.kind === "linked") {
      lines.push(`- **Collection:** [${t.collection.title}](${t.collection.url}) (\`${t.collection.slug}\`)`);
    } else {
      lines.push(
        `- **Collection gap:** recommend \`${t.collection.recommendedSlug}\` — ${t.collection.reason}`
      );
    }
    lines.push(
      `- **Research grade:** ${t.researchGrade.tier} (score ${t.researchGrade.researchGradeScore}, trust ${t.researchGrade.topicTrustScore}, ${t.researchGrade.momentCount} moments, cite ${(t.researchGrade.citationDensity * 100).toFixed(0)}%)`
    );
    lines.push(
      `- **Graph planner:** \`${t.graphPlanner.status}\` — ${t.graphPlanner.reason}`
    );
    lines.push("");

    lines.push("### Why showcase-ready", "");
    for (const w of t.showcaseReadyWhy) lines.push(`- ${w}`);
    lines.push("");

    lines.push("### What still feels weak", "");
    if (!t.weaknesses.length) lines.push("- None flagged.");
    else for (const w of t.weaknesses) lines.push(`- ${w}`);
    lines.push("");

    lines.push("### Trust caveats", "");
    for (const c of t.trustCaveats) lines.push(`- ${c}`);
    lines.push("");

    lines.push("### Source context mix", "");
    for (const s of t.sourceContextMix) {
      lines.push(`- ${s.label}: ${s.count} (${(s.share * 100).toFixed(0)}%)`);
    }
    lines.push("");

    lines.push("### Best 5 moments", "");
    for (const m of t.bestMoments) lines.push(`- ${momentRefMd(m)}`);
    lines.push("");

    lines.push("### Curated picks", "");
    if (t.curated.beginner) lines.push(`- **Beginner:** ${momentRefMd(t.curated.beginner)}`);
    if (t.curated.technical) lines.push(`- **Technical:** ${momentRefMd(t.curated.technical)}`);
    if (t.curated.citationReady) lines.push(`- **Citation-ready:** ${momentRefMd(t.curated.citationReady)}`);
    if (t.curated.comparePair) {
      lines.push(
        `- **Compare pair:** ${t.curated.comparePair.labelA} vs ${t.curated.comparePair.labelB} — ${t.curated.comparePair.contrast}`
      );
      lines.push(`  - A: ${momentRefMd(t.curated.comparePair.momentA)}`);
      lines.push(`  - B: ${momentRefMd(t.curated.comparePair.momentB)}`);
    }
    lines.push("");

    lines.push("### Distribution-ready links", "");
    lines.push(`- Topic (canonical): ${t.distribution.topicUrl}`);
    lines.push(`- Topic tracked (X): ${t.distribution.topicUrlTracked.twitter}`);
    lines.push("- Top 3 moments:");
    for (const u of t.distribution.top3MomentUrls) lines.push(`  - ${u}`);
    lines.push(`- Citation canonical: ${t.distribution.citationUrls.canonical}`);
    lines.push(`- Citation YouTube: ${t.distribution.citationUrls.youtube}`);
    lines.push("- Citation tracked (Reddit):", `  - ${t.distribution.citationUrls.tracked.reddit}`);
    lines.push("");
    lines.push("<details><summary>Share / citation prompt</summary>", "");
    lines.push("```text");
    lines.push(t.distribution.shareCitationPrompt);
    lines.push("```", "</details>", "");
  }

  const plan = report.researchSessionTestPlan;
  lines.push("## Research-session test plan", "");
  lines.push("### User flow", "");
  plan.flow.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push("");
  lines.push("### Expected analytics events", "");
  lines.push("**Research session (persistent):**");
  for (const e of plan.expectedAnalyticsEvents) lines.push(`- \`${e}\``);
  lines.push("");
  lines.push("**Legacy / surface (same tab, attach researchSessionId):**");
  for (const e of plan.legacySurfaceEvents) lines.push(`- \`${e}\``);
  lines.push("");
  lines.push("### Success thresholds", "");
  lines.push("| Metric | Threshold | Rationale |");
  lines.push("|--------|-----------|-----------|");
  for (const s of plan.successThresholds) {
    lines.push(`| ${s.metric} | ${s.threshold} | ${s.rationale} |`);
  }
  lines.push("");
  lines.push("Run aggregate checks: `npm run report:research-sessions` (requires Supabase admin).");
  lines.push("");

  return lines.join("\n");
}
