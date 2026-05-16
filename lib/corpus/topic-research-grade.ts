import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { HighSignalTopicDefinition, HighSignalTrustRequirements } from "@/lib/corpus/high-signal-topics";
import {
  HIGH_SIGNAL_ELITE_REQUIREMENTS,
  listHighSignalTopics,
  matchMomentsToHighSignalTopic,
} from "@/lib/corpus/high-signal-topics";
import { loadAllAllowlistEntries } from "@/lib/corpus/source-allowlists";
import { loadWave1PlanFile } from "@/lib/ingestion-wave-1-validate";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import { comparePublicMomentsForTopic } from "@/lib/research/compare-explanations";
import {
  evaluateSourceAuthorityForPublicMoment,
  type SourceAuthorityLabel,
} from "@/lib/research/source-authority";

export type ResearchGradeTier = "elite" | "strong" | "weak" | "broken";

const PRIMARY_SOURCE_LABELS: SourceAuthorityLabel[] = [
  "primary_source",
  "academic_technical",
  "practitioner",
];

const SHALLOW_LABELS: SourceAuthorityLabel[] = [
  "opinion_heavy",
  "entertainment_commentary",
  "unknown_weak_context",
];

export type TopicResearchGradeMetrics = {
  momentCount: number;
  indexedVideos: number;
  uniqueCreators: number;
  citationDensity: number;
  compareDepth: number;
  sourceDiversity: number;
  primarySourceRatio: number;
  semanticExplanationRatio: number;
  shallowAuthorityShare: number;
  conversationalShare: number;
  repeatSearchPotential: number;
  topicTrustScore: number;
  researchGradeScore: number;
};

export type TopicResearchGradeRow = {
  canonicalSlug: string;
  label: string;
  vertical: string;
  primaryQuery: string;
  requirements: HighSignalTrustRequirements;
  metrics: TopicResearchGradeMetrics;
  tier: ResearchGradeTier;
  failedRequirements: string[];
  distanceToElite: number;
  ingestionPriority: number;
  notes: string[];
};

export type ResearchMoatCandidate = {
  canonicalSlug: string;
  label: string;
  momentCount: number;
  citationDensity: number;
  compareDepth: number;
  researchGradeScore: number;
  rationale: string;
};

export type TopicTrustDriftSignal = {
  canonicalSlug: string;
  label: string;
  driftKind: "more_conversational" | "more_shallow" | "lower_citation_quality" | "mixed";
  detail: string;
  shallowAuthorityDelta: number | null;
  citationDensityDelta: number | null;
  conversationalShareDelta: number | null;
};

export type ResearchGradeTopicReport = {
  generatedAt: string;
  topicCount: number;
  summary: {
    elite: number;
    strong: number;
    weak: number;
    broken: number;
  };
  topics: TopicResearchGradeRow[];
  eliteTopics: TopicResearchGradeRow[];
  weakestFlagshipTopics: TopicResearchGradeRow[];
  closestToElite: TopicResearchGradeRow[];
  highCitationLowDiversity: TopicResearchGradeRow[];
  highDiversityWeakExplanations: TopicResearchGradeRow[];
  researchMoatCandidates: ResearchMoatCandidate[];
  topicTrustDrift: TopicTrustDriftSignal[];
  ingestionPriorities: Array<{
    canonicalSlug: string;
    label: string;
    priority: number;
    actions: string[];
  }>;
};

type PreviousTopicSnapshot = {
  canonicalSlug: string;
  metrics?: {
    shallowAuthorityShare?: number;
    citationDensity?: number;
    conversationalShare?: number;
    momentCount?: number;
  };
};

type PreviousSnapshot = {
  generatedAt?: string;
  topics?: PreviousTopicSnapshot[];
};

function isSemanticExplanation(m: PublicMomentRecord): boolean {
  const kinds = m.semantic?.extractionKinds ?? [];
  return kinds.some((k) =>
    ["explanation", "technical_entity", "definition", "comparison", "evidence"].includes(k)
  );
}

function isConversational(m: PublicMomentRecord): boolean {
  const cls = classifyExplanationFromText({
    phrase: m.phrase,
    snippet: m.snippet,
    videoTitle: m.videoTitle,
    extractionKinds: m.semantic?.extractionKinds,
  });
  return cls.opinionLikelihood >= 1;
}

function repeatSearchPotentialHeuristic(
  def: HighSignalTopicDefinition,
  metrics: Pick<TopicResearchGradeMetrics, "compareDepth" | "sourceDiversity" | "citationDensity">
): number {
  const aliasBreadth = Math.min(def.aliases.length / 6, 1);
  const compareNorm = Math.min(metrics.compareDepth / 4, 1);
  const diversityNorm = Math.min(metrics.sourceDiversity / 4, 1);
  return Math.min(1, aliasBreadth * 0.25 + compareNorm * 0.35 + diversityNorm * 0.25 + metrics.citationDensity * 0.15);
}

export function scoreTopicResearchGrade(
  def: HighSignalTopicDefinition,
  matched: PublicMomentRecord[]
): TopicResearchGradeMetrics {
  const n = matched.length || 1;
  const videoIds = new Set(matched.map((m) => m.videoId));
  const creators = new Set(matched.map((m) => m.channelName).filter(Boolean) as string[]);
  const citeRich = matched.filter(isPublicMomentCitationRich).length;
  const semantic = matched.filter(isSemanticExplanation).length;
  const conversational = matched.filter(isConversational).length;

  const authorityLabels = matched.map((m) => evaluateSourceAuthorityForPublicMoment(m).sourceAuthorityLabel);
  const authoritySet = new Set(authorityLabels);
  const primaryCount = authorityLabels.filter((l) => PRIMARY_SOURCE_LABELS.includes(l)).length;
  const shallowCount = authorityLabels.filter((l) => SHALLOW_LABELS.includes(l)).length;

  const compareRows = comparePublicMomentsForTopic(matched, def.primaryQuery, 8);

  const citationDensity = citeRich / n;
  const compareDepth = compareRows.length;
  const sourceDiversity = authoritySet.size;
  const primarySourceRatio = primaryCount / n;
  const semanticExplanationRatio = semantic / n;
  const shallowAuthorityShare = shallowCount / n;
  const conversationalShare = conversational / n;

  const repeatSearchPotential = repeatSearchPotentialHeuristic(def, {
    compareDepth,
    sourceDiversity,
    citationDensity,
  });

  const topicTrustScore = Math.round(
    Math.min(
      100,
      citationDensity * 28 +
        primarySourceRatio * 22 +
        semanticExplanationRatio * 18 +
        Math.min(sourceDiversity / 4, 1) * 16 +
        Math.min(compareDepth / 4, 1) * 16 -
        shallowAuthorityShare * 22 -
        conversationalShare * 12
    )
  );

  const researchGradeScore = Math.round(
    Math.min(
      100,
      citationDensity * 25 +
        Math.min(compareDepth / 5, 1) * 20 +
        Math.min(sourceDiversity / 5, 1) * 15 +
        primarySourceRatio * 20 +
        semanticExplanationRatio * 15 +
        repeatSearchPotential * 10 -
        shallowAuthorityShare * 25 -
        conversationalShare * 10
    )
  );

  return {
    momentCount: matched.length,
    indexedVideos: videoIds.size,
    uniqueCreators: creators.size,
    citationDensity,
    compareDepth,
    sourceDiversity,
    primarySourceRatio,
    semanticExplanationRatio,
    shallowAuthorityShare,
    conversationalShare,
    repeatSearchPotential,
    topicTrustScore,
    researchGradeScore,
  };
}

function evaluateRequirements(
  req: HighSignalTrustRequirements,
  m: TopicResearchGradeMetrics
): string[] {
  const failed: string[] = [];
  if (m.indexedVideos < req.minIndexedVideos) {
    failed.push(`videos ${m.indexedVideos}<${req.minIndexedVideos}`);
  }
  if (m.uniqueCreators < req.minUniqueCreators) {
    failed.push(`creators ${m.uniqueCreators}<${req.minUniqueCreators}`);
  }
  if (m.citationDensity < req.minCitationDensity) {
    failed.push(`citeDensity ${m.citationDensity.toFixed(2)}<${req.minCitationDensity}`);
  }
  if (m.compareDepth < req.minCompareDepth) {
    failed.push(`compareDepth ${m.compareDepth}<${req.minCompareDepth}`);
  }
  if (m.sourceDiversity < req.minSourceDiversity) {
    failed.push(`sourceDiversity ${m.sourceDiversity}<${req.minSourceDiversity}`);
  }
  if (m.primarySourceRatio < req.minPrimarySourceCoverage) {
    failed.push(`primarySource ${m.primarySourceRatio.toFixed(2)}<${req.minPrimarySourceCoverage}`);
  }
  if (m.semanticExplanationRatio < req.minSemanticExplanationRatio) {
    failed.push(`semantic ${m.semanticExplanationRatio.toFixed(2)}<${req.minSemanticExplanationRatio}`);
  }
  return failed;
}

export function classifyResearchGradeTier(
  metrics: TopicResearchGradeMetrics,
  failed: string[],
  eliteFailed: string[]
): ResearchGradeTier {
  if (metrics.momentCount === 0 || metrics.indexedVideos === 0) return "broken";
  if (failed.length >= 4 || metrics.citationDensity < 0.08) return "broken";
  if (eliteFailed.length === 0 && metrics.researchGradeScore >= 72 && metrics.topicTrustScore >= 65) {
    return "elite";
  }
  if (failed.length === 0 && metrics.researchGradeScore >= 52) return "strong";
  if (failed.length <= 2 && metrics.researchGradeScore >= 32) return "weak";
  if (failed.length >= 3) return "broken";
  return "weak";
}

function distanceToElite(metrics: TopicResearchGradeMetrics): number {
  const elite = HIGH_SIGNAL_ELITE_REQUIREMENTS;
  const gaps = [
    Math.max(0, elite.minCitationDensity - metrics.citationDensity),
    Math.max(0, (elite.minCompareDepth - metrics.compareDepth) / 5),
    Math.max(0, (elite.minSourceDiversity - metrics.sourceDiversity) / 5),
    Math.max(0, elite.minPrimarySourceCoverage - metrics.primarySourceRatio),
    Math.max(0, elite.minSemanticExplanationRatio - metrics.semanticExplanationRatio),
    Math.max(0, metrics.shallowAuthorityShare - 0.2),
  ];
  return Math.round(gaps.reduce((a, b) => a + b, 0) * 100) / 100;
}

function loadPreviousSnapshot(): Map<string, PreviousTopicSnapshot> {
  const path = join(process.cwd(), "data", "research-grade-topic-report.json");
  if (!existsSync(path)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as PreviousSnapshot;
    const map = new Map<string, PreviousTopicSnapshot>();
    for (const row of raw.topics ?? []) {
      map.set(row.canonicalSlug, row);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function detectTopicTrustDrift(
  current: TopicResearchGradeRow[],
  previousBySlug: Map<string, PreviousTopicSnapshot>
): TopicTrustDriftSignal[] {
  const out: TopicTrustDriftSignal[] = [];
  const SHALLOW_DELTA = 0.12;
  const CITE_DELTA = -0.15;
  const CONVO_DELTA = 0.15;
  const MIN_MOMENTS_GROWTH = 3;

  for (const row of current) {
    const prev = previousBySlug.get(row.canonicalSlug)?.metrics;
    if (!prev) continue;
    const m = row.metrics;
    const momentGrowth = m.momentCount - (prev.momentCount ?? 0);
    if (momentGrowth < MIN_MOMENTS_GROWTH) continue;

    const shallowDelta =
      prev.shallowAuthorityShare != null
        ? m.shallowAuthorityShare - prev.shallowAuthorityShare
        : null;
    const citeDelta =
      prev.citationDensity != null ? m.citationDensity - prev.citationDensity : null;
    const convoDelta =
      prev.conversationalShare != null ? m.conversationalShare - prev.conversationalShare : null;

    const signals: string[] = [];
    let kind: TopicTrustDriftSignal["driftKind"] = "mixed";

    if (shallowDelta != null && shallowDelta >= SHALLOW_DELTA) {
      signals.push(`shallow authority share +${(shallowDelta * 100).toFixed(0)}% after corpus growth`);
    }
    if (citeDelta != null && citeDelta <= CITE_DELTA) {
      signals.push(`citation density ${(citeDelta * 100).toFixed(0)}% after ingest expansion`);
    }
    if (convoDelta != null && convoDelta >= CONVO_DELTA) {
      signals.push(`conversational share +${(convoDelta * 100).toFixed(0)}%`);
    }

    if (signals.length === 0) continue;
    if (signals.length === 1) {
      if (shallowDelta != null && shallowDelta >= SHALLOW_DELTA) kind = "more_shallow";
      else if (citeDelta != null && citeDelta <= CITE_DELTA) kind = "lower_citation_quality";
      else kind = "more_conversational";
    }

    out.push({
      canonicalSlug: row.canonicalSlug,
      label: row.label,
      driftKind: kind,
      detail: signals.join("; "),
      shallowAuthorityDelta: shallowDelta,
      citationDensityDelta: citeDelta,
      conversationalShareDelta: convoDelta,
    });
  }

  return out.sort((a, b) => (b.shallowAuthorityDelta ?? 0) - (a.shallowAuthorityDelta ?? 0));
}

export function detectResearchMoatCandidates(rows: TopicResearchGradeRow[]): ResearchMoatCandidate[] {
  const MAX_MOMENTS = 14;
  const MIN_CITE = 0.45;
  const MIN_COMPARE = 2;

  return rows
    .filter(
      (r) =>
        r.metrics.momentCount > 0 &&
        r.metrics.momentCount <= MAX_MOMENTS &&
        r.metrics.citationDensity >= MIN_CITE &&
        r.metrics.compareDepth >= MIN_COMPARE &&
        r.tier !== "broken"
    )
    .sort((a, b) => b.metrics.researchGradeScore - a.metrics.researchGradeScore)
    .slice(0, 15)
    .map((r) => ({
      canonicalSlug: r.canonicalSlug,
      label: r.label,
      momentCount: r.metrics.momentCount,
      citationDensity: r.metrics.citationDensity,
      compareDepth: r.metrics.compareDepth,
      researchGradeScore: r.metrics.researchGradeScore,
      rationale: `Small corpus (${r.metrics.momentCount} moments) with cite density ${(r.metrics.citationDensity * 100).toFixed(0)}% and compare depth ${r.metrics.compareDepth} — high trust per hour indexed`,
    }));
}

function buildIngestionActions(def: HighSignalTopicDefinition, row: TopicResearchGradeRow): string[] {
  const actions: string[] = [];
  const wave1Path = join(process.cwd(), "data", "ingestion-wave-1-candidates.json");
  if (existsSync(wave1Path)) {
    try {
      const candidates = loadWave1PlanFile(wave1Path).candidates ?? [];
      const keys = def.primaryQuery.toLowerCase().split(/\s+/);
      const hits = candidates
        .filter((c) =>
          (c.targetTopics ?? []).some((t) => keys.some((k) => t.replace(/-/g, " ").includes(k)))
        )
        .slice(0, 2);
      for (const h of hits) {
        actions.push(`Wave 1: ${h.id} ${h.channelName} — ${h.videoTitle.slice(0, 60)}…`);
      }
    } catch {
      // ignore
    }
  }

  const allow = loadAllAllowlistEntries()
    .filter((a) => a.ingestPriority >= 88)
    .slice(0, 1);
  for (const a of allow) {
    actions.push(`Allowlist: prioritize ${a.channelName} (${a.category})`);
  }

  if (row.metrics.compareDepth < def.requirements.minCompareDepth) {
    actions.push("Add second creator/video with contrasting framing for compare depth");
  }
  if (row.metrics.citationDensity < def.requirements.minCitationDensity) {
    actions.push("Index citation-dense tutorials or paper-walkthroughs, not interview chatter");
  }
  if (row.metrics.primarySourceRatio < def.requirements.minPrimarySourceCoverage) {
    actions.push("Prioritize primary-source shaped content (docs, papers, official explainers)");
  }

  return [...new Set(actions)].slice(0, 5);
}

function ingestionPriorityScore(row: TopicResearchGradeRow): number {
  const tierWeight = { broken: 100, weak: 70, strong: 40, elite: 10 }[row.tier];
  const gap = distanceToElite(row.metrics);
  const trustInverse = 100 - row.metrics.topicTrustScore;
  return Math.round(tierWeight + trustInverse * 0.4 + gap * 30);
}

export function buildResearchGradeTopicReport(moments: PublicMomentRecord[]): ResearchGradeTopicReport {
  const defs = listHighSignalTopics();
  const previousBySlug = loadPreviousSnapshot();
  const rows: TopicResearchGradeRow[] = [];

  for (const def of defs) {
    const matched = matchMomentsToHighSignalTopic(def, moments);
    const metrics = scoreTopicResearchGrade(def, matched);
    const failed = evaluateRequirements(def.requirements, metrics);
    const eliteFailed = evaluateRequirements(HIGH_SIGNAL_ELITE_REQUIREMENTS, metrics);
    const tier = classifyResearchGradeTier(metrics, failed, eliteFailed);
    const notes: string[] = [];
    if (metrics.citationDensity >= 0.5 && metrics.sourceDiversity < def.requirements.minSourceDiversity) {
      notes.push("high citation but low creator/authority diversity");
    }
    if (metrics.sourceDiversity >= 3 && metrics.semanticExplanationRatio < def.requirements.minSemanticExplanationRatio) {
      notes.push("diverse sources but weak semantic explanations");
    }

    rows.push({
      canonicalSlug: def.canonicalSlug,
      label: def.label,
      vertical: def.vertical,
      primaryQuery: def.primaryQuery,
      requirements: def.requirements,
      metrics,
      tier,
      failedRequirements: failed,
      distanceToElite: distanceToElite(metrics),
      ingestionPriority: 0,
      notes,
    });
  }

  for (const row of rows) {
    row.ingestionPriority = ingestionPriorityScore(row);
  }

  const eliteTopics = rows.filter((r) => r.tier === "elite").sort((a, b) => b.metrics.researchGradeScore - a.metrics.researchGradeScore);
  const weakestFlagshipTopics = [...rows]
    .filter((r) => r.tier === "broken" || r.tier === "weak")
    .sort((a, b) => a.metrics.researchGradeScore - b.metrics.researchGradeScore)
    .slice(0, 15);
  const closestToElite = rows
    .filter((r) => r.tier === "strong" || r.tier === "weak")
    .sort((a, b) => a.distanceToElite - b.distanceToElite)
    .slice(0, 15);
  const highCitationLowDiversity = rows
    .filter((r) => r.notes.some((n) => n.includes("low creator")))
    .sort((a, b) => b.metrics.citationDensity - a.metrics.citationDensity)
    .slice(0, 12);
  const highDiversityWeakExplanations = rows
    .filter((r) => r.notes.some((n) => n.includes("weak semantic")))
    .sort((a, b) => b.metrics.sourceDiversity - a.metrics.sourceDiversity)
    .slice(0, 12);

  const researchMoatCandidates = detectResearchMoatCandidates(rows);
  const topicTrustDrift = detectTopicTrustDrift(rows, previousBySlug);

  const ingestionPriorities = [...rows]
    .filter((r) => r.tier !== "elite")
    .sort((a, b) => b.ingestionPriority - a.ingestionPriority)
    .slice(0, 20)
    .map((r) => {
      const def = defs.find((d) => d.canonicalSlug === r.canonicalSlug)!;
      return {
        canonicalSlug: r.canonicalSlug,
        label: r.label,
        priority: r.ingestionPriority,
        actions: buildIngestionActions(def, r),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    topicCount: rows.length,
    summary: {
      elite: rows.filter((r) => r.tier === "elite").length,
      strong: rows.filter((r) => r.tier === "strong").length,
      weak: rows.filter((r) => r.tier === "weak").length,
      broken: rows.filter((r) => r.tier === "broken").length,
    },
    topics: rows,
    eliteTopics,
    weakestFlagshipTopics,
    closestToElite,
    highCitationLowDiversity,
    highDiversityWeakExplanations,
    researchMoatCandidates,
    topicTrustDrift,
    ingestionPriorities,
  };
}

export function formatResearchGradeTopicMarkdown(report: ResearchGradeTopicReport): string {
  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(0)}%` : "—");

  const tierTable = `| Tier | Count | Share |
|------|------:|------:|
| elite | ${report.summary.elite} | ${pct(report.summary.elite, report.topicCount)} |
| strong | ${report.summary.strong} | ${pct(report.summary.strong, report.topicCount)} |
| weak | ${report.summary.weak} | ${pct(report.summary.weak, report.topicCount)} |
| broken | ${report.summary.broken} | ${pct(report.summary.broken, report.topicCount)} |`;

  const eliteList = report.eliteTopics
    .slice(0, 20)
    .map(
      (r) =>
        `- **${r.label}** (\`${r.canonicalSlug}\`) — grade ${r.metrics.researchGradeScore}, trust ${r.metrics.topicTrustScore}, cite ${(r.metrics.citationDensity * 100).toFixed(0)}%, compare ${r.metrics.compareDepth}`
    )
    .join("\n");

  const moatList = report.researchMoatCandidates
    .map((m) => `- **${m.label}** — ${m.rationale}`)
    .join("\n");

  const driftList =
    report.topicTrustDrift.length > 0
      ? report.topicTrustDrift
          .map((d) => `- **${d.label}** (\`${d.driftKind}\`): ${d.detail}`)
          .join("\n")
      : "_No drift vs previous report snapshot (run twice after ingest expansion to detect)._";

  const ingestList = report.ingestionPriorities
    .slice(0, 12)
    .map(
      (p) =>
        `### ${p.label} (priority ${p.priority})\n${p.actions.map((a) => `- ${a}`).join("\n") || "- _(no actions)_"}`
    )
    .join("\n\n");

  return `# Research-grade topic report

Generated: ${report.generatedAt}

High-signal corpus program — **${report.topicCount}** curated topics. Optimized for trust density and compare depth, not traffic volume.

## Summary

${tierTable}

## Elite topics (research-grade)

${eliteList || "_None at elite bar yet._"}

## Weakest flagship topics

${report.weakestFlagshipTopics
  .map(
    (r) =>
      `- **${r.label}** — \`${r.tier}\`, grade ${r.metrics.researchGradeScore}, failed: ${r.failedRequirements.join("; ") || "—"}`
  )
  .join("\n")}

## Closest to elite

${report.closestToElite
  .map(
    (r) =>
      `- **${r.label}** — distance ${r.distanceToElite.toFixed(2)}, grade ${r.metrics.researchGradeScore}, tier \`${r.tier}\``
  )
  .join("\n")}

## High citation, weak diversity

${report.highCitationLowDiversity.map((r) => `- **${r.label}** — cite ${(r.metrics.citationDensity * 100).toFixed(0)}%, diversity ${r.metrics.sourceDiversity}`).join("\n") || "_None flagged._"}

## High diversity, weak explanations

${report.highDiversityWeakExplanations.map((r) => `- **${r.label}** — diversity ${r.metrics.sourceDiversity}, semantic ${(r.metrics.semanticExplanationRatio * 100).toFixed(0)}%`).join("\n") || "_None flagged._"}

## Research moat candidates

Small corpus + unusually high citation/compare depth:

${moatList || "_None detected._"}

## Topic trust drift

${driftList}

## Recommended ingestion priorities

${ingestList}

## Regenerate

\`\`\`bash
npm run report:research-grade-topics
\`\`\`

See \`lib/corpus/high-signal-topics.ts\` and \`lib/corpus/topic-research-grade.ts\`.
`;
}
