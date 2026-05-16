/**
 * Elite-topic program — select and plan deliberate topic-deepening batches.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ResearchGradeTopicReport } from "@/lib/corpus/topic-research-grade";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

import { buildTopicDeepeningFromDisk, type TopicDeepeningAnalysis } from "./topic-deepening";

export type EliteTopicProgramEntry = {
  topicSlug: string;
  label: string;
  vertical: string;
  selectionRank: number;
  selectionScore: number;
  selectionRationale: string[];
  currentStatus: string;
  researchGradeTier: string;
  distanceToElite: number;
  topicTrustScore: number;
  researchGradeScore: number;
  momentCount: number;
  missingCapabilities: string[];
  targetMetrics: {
    minCitationDensity: number;
    minPrimarySourceCoverage: number;
    minCompareDepth: number;
    minUniqueCreators: number;
    targetTier: "elite" | "strong";
    targetDeepeningStatus: "ready_to_showcase";
  };
  candidateVideos: Array<{ id: string; videoId: string; label: string; riskLevel: string }>;
  maxIngestCount: number;
  risks: string[];
  expectedGraphGain: string;
  expectedUserValue: string;
  homepageFlagshipValue: boolean;
};

export type EliteTopicProgram = {
  version: 1;
  generatedAt: string;
  milestone: string;
  alreadyEliteOrShowcase: string[];
  selectedTopics: EliteTopicProgramEntry[];
  primaryLiveIngestTopic: string;
  selectionNotes: string[];
};

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function loadResearchGrade(root: string): ResearchGradeTopicReport | null {
  return loadJson<ResearchGradeTopicReport>(join(root, "data", "research-grade-topic-report.json"));
}

function loadFlagshipIds(root: string): Set<string> {
  const raw = loadJson<{ topics?: Array<{ id: string }> }>(
    join(root, "data", "flagship-topic-coverage.json")
  );
  return new Set((raw?.topics ?? []).map((t) => t.id));
}

function scoreCandidate(a: TopicDeepeningAnalysis, grade: ResearchGradeTopicReport | null): number {
  if (a.status === "broken_do_not_promote") return -1000;
  if (a.status === "ready_to_showcase") return -500;

  const row = grade?.topics.find((t) => t.canonicalSlug === a.topicSlug);
  const waveVideos = a.ingestionCandidates.filter((c) => c.kind === "wave1_video").length;
  const citeHeadroom = Math.max(0, 0.75 - a.metrics.citationDensity);
  const primaryGap = Math.max(0, 0.15 - a.metrics.primarySourceCoverage);

  return (
    a.priority +
    (1 - Math.min(a.metrics.distanceToElite, 1.5)) * 40 +
    waveVideos * 25 +
    citeHeadroom * 15 +
    primaryGap * 20 +
    (row?.metrics.researchGradeScore ?? 0) * 0.15 +
    a.metrics.graphMomentCount * 0.5
  );
}

export function selectEliteProgramTopics(
  analyses: TopicDeepeningAnalysis[],
  grade: ResearchGradeTopicReport | null,
  limit = 3
): TopicDeepeningAnalysis[] {
  const ranked = [...analyses]
    .map((a) => ({ a, score: scoreCandidate(a, grade) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);

  const picked: TopicDeepeningAnalysis[] = [];
  const usedVerticals = new Set<string>();

  for (const { a } of ranked) {
    if (picked.length >= limit) break;
    if (usedVerticals.has(a.vertical) && picked.length >= 2) continue;
    picked.push(a);
    usedVerticals.add(a.vertical);
  }

  while (picked.length < limit && ranked.length > picked.length) {
    const next = ranked.find((r) => !picked.includes(r.a))?.a;
    if (!next) break;
    picked.push(next);
  }

  return picked;
}

export function buildEliteTopicProgram(root = process.cwd()): EliteTopicProgram {
  const moments = loadPublicMoments();
  const deepening = buildTopicDeepeningFromDisk(moments, root);
  const grade = loadResearchGrade(root);
  const flagshipIds = loadFlagshipIds(root);

  const alreadyEliteOrShowcase = deepening.analyses
    .filter((a) => a.status === "ready_to_showcase" || a.metrics.researchGradeTier === "elite")
    .map((a) => a.topicSlug);

  const selected = selectEliteProgramTopics(deepening.analyses, grade, 3);

  const entries: EliteTopicProgramEntry[] = selected.map((a, i) => {
    const row = grade?.topics.find((t) => t.canonicalSlug === a.topicSlug);
    const req = row?.requirements;
    const waveCands = a.ingestionCandidates
      .filter((c) => c.kind === "wave1_video")
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        videoId: c.videoId ?? "",
        label: c.label,
        riskLevel: c.riskLevel,
      }));

    const rationale: string[] = [
      `Queue priority ${a.priority}; elite distance ${a.metrics.distanceToElite.toFixed(2)}.`,
      `Citation density ${(a.metrics.citationDensity * 100).toFixed(0)}%; compare readiness ${(a.metrics.compareReadiness * 100).toFixed(0)}%.`,
    ];
    if (waveCands.length) rationale.push(`${waveCands.length} wave-1 video candidate(s) with transcript path.`);
    if (a.metrics.primarySourceCoverage < 0.15) {
      rationale.push("Primary-source gap is the main blocker — ingest targets paper/tutorial voices.");
    }

    const homepageFlagshipValue =
      flagshipIds.has(a.topicSlug) ||
      a.topicSlug.includes("rag") ||
      ["ai_ml", "education"].includes(a.vertical);

    return {
      topicSlug: a.topicSlug,
      label: a.label,
      vertical: a.vertical,
      selectionRank: i + 1,
      selectionScore: Math.round(scoreCandidate(a, grade)),
      selectionRationale: rationale,
      currentStatus: a.status,
      researchGradeTier: a.metrics.researchGradeTier,
      distanceToElite: a.metrics.distanceToElite,
      topicTrustScore: a.metrics.topicTrustScore,
      researchGradeScore: row?.metrics.researchGradeScore ?? 0,
      momentCount: a.metrics.graphMomentCount,
      missingCapabilities: a.targetMissingCapabilities,
      targetMetrics: {
        minCitationDensity: req?.minCitationDensity ?? 0.25,
        minPrimarySourceCoverage: req?.minPrimarySourceCoverage ?? 0.15,
        minCompareDepth: req?.minCompareDepth ?? 2,
        minUniqueCreators: req?.minUniqueCreators ?? 2,
        targetTier: "elite",
        targetDeepeningStatus: "ready_to_showcase",
      },
      candidateVideos: waveCands,
      maxIngestCount: Math.min(3, a.maxRecommendedIngestCount || 3),
      risks: [a.riskLevel, waveCands.length ? "wave_verified" : "allowlist_only"].filter(Boolean),
      expectedGraphGain: a.expectedGraphGain,
      expectedUserValue:
        a.vertical === "ai_ml"
          ? "Research-grade compare/cite surfaces for technical search intent."
          : "Structured learning paths with citation-rich tutorial moments.",
      homepageFlagshipValue,
    };
  });

  const primary =
    entries.find((e) => e.candidateVideos.length >= 2 && e.distanceToElite < 0.2)?.topicSlug ??
    entries[0]?.topicSlug ??
    "statistics-for-ml";

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    milestone: "RAG elite + at least one additional topic via controlled topic-deepening loop",
    alreadyEliteOrShowcase,
    selectedTopics: entries,
    primaryLiveIngestTopic: primary,
    selectionNotes: [
      "Excluded broken_do_not_promote and ready_to_showcase topics from selection pool.",
      "Prefer topics with wave-1 video IDs (not allowlist-only) and smallest elite distance.",
      "vector-databases, embeddings, prompt-engineering, ai-agents skipped — broken in current corpus.",
    ],
  };
}

export function formatEliteTopicProgramMarkdown(program: EliteTopicProgram): string {
  const lines: string[] = [
    "# Elite topic program plan",
    "",
    `Generated: ${program.generatedAt}`,
    "",
    "## Milestone",
    "",
    program.milestone,
    "",
    "## Already elite / showcase",
    "",
    program.alreadyEliteOrShowcase.length
      ? program.alreadyEliteOrShowcase.map((s) => `- \`${s}\``).join("\n")
      : "_None_",
    "",
    "## Selected topics (next 3 deepening batches)",
    "",
    `**Primary live ingest (this run):** \`${program.primaryLiveIngestTopic}\``,
    "",
  ];

  for (const e of program.selectedTopics) {
    lines.push(`### ${e.selectionRank}. ${e.label} (\`${e.topicSlug}\`)`, "");
    lines.push(`- Selection score: **${e.selectionScore}**`);
    lines.push(`- Status: **${e.currentStatus}** | Research grade: **${e.researchGradeTier}** | Elite distance: **${e.distanceToElite.toFixed(2)}**`);
    lines.push(`- Trust: **${e.topicTrustScore}** | Moments: **${e.momentCount}** | Max ingest: **${e.maxIngestCount}**`);
    lines.push(`- Missing: ${e.missingCapabilities.slice(0, 5).join(", ")}`);
    lines.push(`- Expected graph gain: ${e.expectedGraphGain}`);
    lines.push(`- Expected user value: ${e.expectedUserValue}`);
    lines.push(`- Risks: ${e.risks.join(", ")}`);
    lines.push("");
    if (e.candidateVideos.length) {
      lines.push("**Candidate videos:**");
      for (const v of e.candidateVideos) {
        lines.push(`- ${v.id} \`${v.videoId}\` (${v.riskLevel}) — ${v.label.slice(0, 80)}…`);
      }
      lines.push("");
    }
    for (const r of e.selectionRationale) lines.push(`- ${r}`);
    lines.push("");
  }

  lines.push("## Selection notes", "");
  for (const n of program.selectionNotes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

export function writeEliteTopicProgramArtifacts(program: EliteTopicProgram, root = process.cwd()) {
  writeFileSync(join(root, "data", "elite-topic-program.json"), JSON.stringify(program, null, 2), "utf-8");
  writeFileSync(join(root, "ELITE_TOPIC_PROGRAM_PLAN.md"), formatEliteTopicProgramMarkdown(program), "utf-8");
}
