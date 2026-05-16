import type { Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import type { RetrievalQualityDimensionId } from "@/lib/corpus/retrieval-quality";
import type { VideoEvalSlice } from "@/lib/corpus/retrieval-weight-validation";

export const WAVE1_REVIEW_DECISIONS = [
  "approve_next_batch",
  "hold",
  "reject",
  "needs_more_context",
] as const;

export type Wave1ReviewDecision = (typeof WAVE1_REVIEW_DECISIONS)[number];

export type Wave1ShortlistCategory =
  | "uncertain"
  | "high-score-high-risk"
  | "low-score-high-potential";

export type Wave1ShortlistRow = {
  videoId: string;
  title: string;
  channel: string;
  category: string;
  predictedStrengths: string[];
  predictedRisks: string[];
  whyHumanReviewNeeded: string;
};

export type Wave1ManualReviewShortlist = {
  generatedAt?: string;
  recommendation?: string;
  uncertain: Wave1ShortlistRow[];
  highScoreHighRisk: Wave1ShortlistRow[];
  lowScoreHighPotential: Wave1ShortlistRow[];
};

export type Wave1ProfilePosition = {
  tunedV2Rank: number | null;
  tunedV2RankTotal: number;
  inTop5: { pre_calibration: boolean; tuned_v1: boolean; tuned_v2: boolean };
  inTop10: { pre_calibration: boolean; tuned_v1: boolean; tuned_v2: boolean };
  priorityScorePre: number | null;
  priorityScoreTunedV1: number | null;
  priorityScoreTunedV2: number | null;
  citationsPerHour: number | null;
  retrievalOverall: number | null;
};

export type Wave1RetrievalIndicators = {
  retrievalTier: string | null;
  retrievalOverall: number | null;
  explanationDensity: number | null;
  citationRichness: number | null;
  actionableTutorialDensity: number | null;
  technicalTerminologyDensity: number | null;
  clipExtractionQuality: number | null;
  semanticMomentYield: number | null;
  shallowAuthorityFlag: boolean;
  transcriptPoisonFlags: string[];
  governanceFlags: string[];
};

export type Wave1HumanReviewRow = {
  videoId: string;
  title: string;
  channel: string;
  category: Wave1ShortlistCategory;
  profilePosition: Wave1ProfilePosition;
  predictedStrengths: string[];
  predictedRisks: string[];
  whyHumanReviewNeeded: string;
  targetTopics: string[];
  sourceQualityScore: number | null;
  sourceQualityTier: string | null;
  retrievalQualityIndicators: Wave1RetrievalIndicators;
  youtubeUrl: string;
  decision: Wave1ReviewDecision;
  reviewerNotes: string;
};

export type Wave1HumanReviewDecisionsFile = {
  version: 1;
  generatedAt: string;
  sourceArtifacts: {
    shortlist: string;
    ranked: string;
    governanceDiagnosis: string;
  };
  readyForNextIngestBatch: boolean;
  recommendedNextAction: "manual_review_required";
  rubricVersion: 1;
  decisions: Wave1HumanReviewRow[];
  summary: {
    totalRows: number;
    byCategory: Record<Wave1ShortlistCategory, number>;
    byDecision: Record<Wave1ReviewDecision, number>;
    approvedCount: number;
  };
};

export class Wave1ManualReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wave1ManualReviewValidationError";
  }
}

function dimNorm(
  retrieval: VideoEvalSlice["retrieval"] | undefined,
  id: RetrievalQualityDimensionId
): number | null {
  const d = retrieval?.dimensions.find((x) => x.id === id);
  return d?.normalized ?? null;
}

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function normalizeCategory(raw: string): Wave1ShortlistCategory {
  if (raw === "high_score_high_risk") return "high-score-high-risk";
  if (raw === "low_score_high_potential") return "low-score-high-potential";
  if (raw === "uncertain") return "uncertain";
  if (raw === "high-score-high-risk" || raw === "low-score-high-potential") return raw;
  throw new Error(`Unknown shortlist category: ${raw}`);
}

export function flattenShortlist(shortlist: Wave1ManualReviewShortlist): Wave1ShortlistRow[] {
  return [
    ...(shortlist.uncertain ?? []),
    ...(shortlist.highScoreHighRisk ?? []),
    ...(shortlist.lowScoreHighPotential ?? []),
  ];
}

type RankedEntry = {
  videoId: string;
  priorityScorePre?: number;
  priorityScoreTunedV1?: number;
  priorityScoreTunedV2?: number;
  citationsPerHour?: number | null;
  retrievalOverall?: number;
};

type GovernanceDiagnosis = {
  overlapTop5?: {
    pre_calibration?: string[];
    tuned_v1?: string[];
    tuned_v2?: string[];
  };
  overlapTop10?: {
    pre_calibration?: string[];
    tuned_v1?: string[];
    tuned_v2?: string[];
  };
};

function shallowAuthorityHeuristic(
  evalSlice: VideoEvalSlice | undefined,
  channelName: string
): boolean {
  if (
    evalSlice?.retrieval.flags.poorCitationValue ||
    evalSlice?.retrieval.flags.weakEducationalDensity
  ) {
    return true;
  }
  return /\b(podcast|fridman|dwarkesh|rogan|interview)\b/i.test(channelName);
}

export function buildRetrievalIndicators(
  evalSlice: VideoEvalSlice | undefined,
  rankedEntry: RankedEntry | undefined,
  channelName: string
): Wave1RetrievalIndicators {
  const retrieval = evalSlice?.retrieval;
  const matchedReject = (retrieval?.rejectHeuristics ?? [])
    .filter((h) => h.matched)
    .map((h) => h.id);
  const flags = retrieval?.flags?.reasons ?? [];
  return {
    retrievalTier: retrieval?.tier ?? null,
    retrievalOverall: retrieval?.overallNormalized ?? rankedEntry?.retrievalOverall ?? null,
    explanationDensity: dimNorm(retrieval, "explanation_density"),
    citationRichness: dimNorm(retrieval, "citation_richness"),
    actionableTutorialDensity: dimNorm(retrieval, "actionable_tutorial_density"),
    technicalTerminologyDensity: dimNorm(retrieval, "technical_terminology_density"),
    clipExtractionQuality: dimNorm(retrieval, "clip_extraction_quality"),
    semanticMomentYield: dimNorm(retrieval, "semantic_moment_yield"),
    shallowAuthorityFlag: shallowAuthorityHeuristic(evalSlice, channelName),
    transcriptPoisonFlags: matchedReject.filter((id) =>
      ["excessive_intro_outro_cta", "repeated_cta_language", "sponsor_heavy"].includes(id)
    ),
    governanceFlags: flags,
  };
}

export function buildProfilePosition(
  videoId: string,
  ranked: RankedEntry[],
  diagnosis: GovernanceDiagnosis
): Wave1ProfilePosition {
  const idx = ranked.findIndex((r) => r.videoId === videoId);
  const row = idx >= 0 ? ranked[idx] : undefined;
  const inList = (list: string[] | undefined) => (list ?? []).includes(videoId);
  return {
    tunedV2Rank: idx >= 0 ? idx + 1 : null,
    tunedV2RankTotal: ranked.length,
    inTop5: {
      pre_calibration: inList(diagnosis.overlapTop5?.pre_calibration),
      tuned_v1: inList(diagnosis.overlapTop5?.tuned_v1),
      tuned_v2: inList(diagnosis.overlapTop5?.tuned_v2),
    },
    inTop10: {
      pre_calibration: inList(diagnosis.overlapTop10?.pre_calibration),
      tuned_v1: inList(diagnosis.overlapTop10?.tuned_v1),
      tuned_v2: inList(diagnosis.overlapTop10?.tuned_v2),
    },
    priorityScorePre: row?.priorityScorePre ?? null,
    priorityScoreTunedV1: row?.priorityScoreTunedV1 ?? null,
    priorityScoreTunedV2: row?.priorityScoreTunedV2 ?? null,
    citationsPerHour: row?.citationsPerHour ?? null,
    retrievalOverall: row?.retrievalOverall ?? null,
  };
}

export function prepareWave1HumanReview(input: {
  shortlist: Wave1ManualReviewShortlist;
  ranked: { ranked: RankedEntry[] };
  diagnosis: GovernanceDiagnosis;
  candidateByVideoId: Map<string, Wave1PlanCandidate>;
  evalByVideoId: Map<string, VideoEvalSlice>;
  existing?: Wave1HumanReviewDecisionsFile | null;
  generatedAt?: string;
}): Wave1HumanReviewDecisionsFile {
  const rows = flattenShortlist(input.shortlist);
  const existingById = new Map(
    (input.existing?.decisions ?? []).map((d) => [d.videoId, d])
  );
  const ranked = input.ranked.ranked ?? [];

  const decisions: Wave1HumanReviewRow[] = rows.map((row) => {
    const category = normalizeCategory(row.category);
    const candidate = input.candidateByVideoId.get(row.videoId);
    const evalSlice = input.evalByVideoId.get(row.videoId);
    const rankedEntry = ranked.find((r) => r.videoId === row.videoId);
    const prev = existingById.get(row.videoId);

    const decision: Wave1ReviewDecision =
      prev && WAVE1_REVIEW_DECISIONS.includes(prev.decision)
        ? prev.decision
        : "needs_more_context";

    return {
      videoId: row.videoId,
      title: row.title,
      channel: row.channel,
      category,
      profilePosition: buildProfilePosition(row.videoId, ranked, input.diagnosis),
      predictedStrengths: row.predictedStrengths,
      predictedRisks: row.predictedRisks,
      whyHumanReviewNeeded: row.whyHumanReviewNeeded,
      targetTopics: candidate?.targetTopics ?? [],
      sourceQualityScore: candidate?.sourceQuality?.score ?? null,
      sourceQualityTier: candidate?.sourceQuality?.tier ?? null,
      retrievalQualityIndicators: buildRetrievalIndicators(evalSlice, rankedEntry, row.channel),
      youtubeUrl: candidate?.url ?? youtubeWatchUrl(row.videoId),
      decision,
      reviewerNotes: prev?.reviewerNotes ?? "",
    };
  });

  const byDecision = Object.fromEntries(
    WAVE1_REVIEW_DECISIONS.map((d) => [d, 0])
  ) as Record<Wave1ReviewDecision, number>;
  const byCategory = {
    uncertain: 0,
    "high-score-high-risk": 0,
    "low-score-high-potential": 0,
  } satisfies Record<Wave1ShortlistCategory, number>;
  for (const d of decisions) {
    byDecision[d.decision]++;
    byCategory[d.category]++;
  }
  const approvedCount = byDecision.approve_next_batch;

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceArtifacts: {
      shortlist: "data/wave-1-manual-review-shortlist.json",
      ranked: "data/ingestion-wave-1-ranked.json",
      governanceDiagnosis: "data/retrieval-governance-diagnosis.json",
    },
    readyForNextIngestBatch: approvedCount >= 1 && approvedCount <= 5,
    recommendedNextAction: "manual_review_required",
    rubricVersion: 1,
    decisions,
    summary: {
      totalRows: decisions.length,
      byCategory,
      byDecision,
      approvedCount,
    },
  };
}

export function validateWave1HumanReview(input: {
  shortlist: Wave1ManualReviewShortlist;
  review: Wave1HumanReviewDecisionsFile;
  allowMoreApprovals?: boolean;
}): void {
  const shortlistRows = flattenShortlist(input.shortlist);
  const shortlistIds = new Set(shortlistRows.map((r) => r.videoId));
  const reviewIds = input.review.decisions.map((d) => d.videoId);

  if (shortlistIds.size !== shortlistRows.length) {
    throw new Wave1ManualReviewValidationError("Shortlist contains duplicate video IDs");
  }

  const reviewIdSet = new Set(reviewIds);
  if (reviewIdSet.size !== reviewIds.length) {
    throw new Wave1ManualReviewValidationError("Review JSON contains duplicate video IDs");
  }

  for (const id of shortlistIds) {
    if (!reviewIdSet.has(id)) {
      throw new Wave1ManualReviewValidationError(`Shortlist video ${id} missing from review JSON`);
    }
  }

  for (const id of reviewIdSet) {
    if (!shortlistIds.has(id)) {
      throw new Wave1ManualReviewValidationError(`Review video ${id} not in shortlist`);
    }
  }

  for (const row of input.review.decisions) {
    if (!WAVE1_REVIEW_DECISIONS.includes(row.decision)) {
      throw new Wave1ManualReviewValidationError(
        `Invalid decision "${row.decision}" for ${row.videoId}`
      );
    }
    if (!row.youtubeUrl?.trim()) {
      throw new Wave1ManualReviewValidationError(`Missing YouTube URL for ${row.videoId}`);
    }
    const urlOk =
      /^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}$/.test(row.youtubeUrl) ||
      /^https:\/\/youtu\.be\/[\w-]{11}$/.test(row.youtubeUrl);
    if (!urlOk) {
      throw new Wave1ManualReviewValidationError(
        `Invalid YouTube URL for ${row.videoId}: ${row.youtubeUrl}`
      );
    }
    const vidFromUrl = row.youtubeUrl.includes("youtu.be")
      ? row.youtubeUrl.split("/").pop()
      : new URL(row.youtubeUrl).searchParams.get("v");
    if (vidFromUrl !== row.videoId) {
      throw new Wave1ManualReviewValidationError(
        `YouTube URL video id mismatch for ${row.videoId}`
      );
    }
  }

  const approved = input.review.decisions.filter((d) => d.decision === "approve_next_batch");
  const maxApprovals = input.allowMoreApprovals ? Infinity : 5;
  if (approved.length > maxApprovals) {
    throw new Wave1ManualReviewValidationError(
      `${approved.length} approve_next_batch rows exceed limit of 5 (set WAVE1_REVIEW_ALLOW_MORE_APPROVALS=1 to override)`
    );
  }
}

function fmtNum(n: number | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function profilePositionLine(p: Wave1ProfilePosition): string {
  const top5 = [
    p.inTop5.pre_calibration ? "pre" : null,
    p.inTop5.tuned_v1 ? "v1" : null,
    p.inTop5.tuned_v2 ? "v2" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const rank =
    p.tunedV2Rank != null
      ? `tuned_v2 rank **${p.tunedV2Rank}** / ${p.tunedV2RankTotal}`
      : "not in ranked simulation";
  return `${rank}; top-5 profiles: ${top5 || "none"}; priority pre/v1/v2 = ${fmtNum(p.priorityScorePre, 0)}/${fmtNum(p.priorityScoreTunedV1, 0)}/${fmtNum(p.priorityScoreTunedV2, 0)}; cite/h = ${fmtNum(p.citationsPerHour)}`;
}

export function formatWave1ManualReviewMarkdown(
  pack: Wave1HumanReviewDecisionsFile
): string {
  const lines: string[] = [
    "# Wave 1 — manual review pack",
    "",
    `Generated: ${pack.generatedAt}`,
    "",
    "Governance checkpoint before the next controlled ingest batch. Judgment stays explicit; automation does not replace reviewer decisions.",
    "",
    "## Outcome (update after review)",
    "",
    `- **Ready for next ingest batch?** \`${pack.readyForNextIngestBatch}\` — requires **1–5** rows with decision \`approve_next_batch\` and no conflicting rejects.`,
    `- **Recommended next action:** \`${pack.recommendedNextAction}\``,
    `- **Approved for next batch:** ${pack.summary.approvedCount} / ${pack.summary.totalRows}`,
    "",
    "## Review rubric",
    "",
    "Score each dimension **1 (weak) – 5 (strong)** while watching or skimming the video and transcript sample. Use notes in `reviewerNotes` in `data/wave-1-human-review-decisions.json`.",
    "",
    "| Criterion | What to look for |",
    "|-----------|------------------|",
    "| **Explanation density** | Clear definitions, step-by-step reasoning, not just headlines or hype. |",
    "| **Citation potential** | Quotable claims, evidence, paper names, benchmarks — moments worth citing in research writing. |",
    "| **Tutorial / practical value** | Actionable procedures, commands, configs — useful for practitioners, not only narrative. |",
    "| **Source authority context** | Channel trust is a prior only; verify the *episode* adds expert depth vs shallow interview chatter. |",
    "| **Transcript availability likelihood** | Captions quality, segment coherence, risk of poison/CTA segments breaking extraction. |",
    "| **Topic coverage gain** | Fills gaps in `targetTopics` without duplicating near-identical corpus videos. |",
    "| **Duplicate risk** | Same guest/topic/channel already represented in Wave 1 or indexed corpus. |",
    "| **Conversational filler risk** | Long tangents, ads, multi-speaker chaos, listicle fluff lowering cite-worthy density. |",
    "| **Expected research value per hour** | Expected cite-worthy + accepted moments per indexed transcript hour after materialization. |",
    "",
    "## Decision values",
    "",
    "| Value | Meaning |",
    "|-------|---------|",
    "| `approve_next_batch` | Include in the **next** controlled ingest batch (max 5 total). |",
    "| `hold` | Defer; may revisit after more context or corpus changes. |",
    "| `reject` | Do not ingest in Wave 1 expansion. |",
    "| `needs_more_context` | Default — reviewer has not decided yet. |",
    "",
    "## Summary",
    "",
    `| Category | Count |`,
    `|----------|------:|`,
    `| uncertain | ${pack.summary.byCategory.uncertain} |`,
    `| high-score-high-risk | ${pack.summary.byCategory["high-score-high-risk"]} |`,
    `| low-score-high-potential | ${pack.summary.byCategory["low-score-high-potential"]} |`,
    "",
    `| Decision | Count |`,
    `|----------|------:|`,
    ...WAVE1_REVIEW_DECISIONS.map(
      (d) => `| \`${d}\` | ${pack.summary.byDecision[d]} |`
    ),
    "",
    "## Candidates",
    "",
  ];

  const order: Wave1ShortlistCategory[] = [
    "uncertain",
    "high-score-high-risk",
    "low-score-high-potential",
  ];
  for (const cat of order) {
    const group = pack.decisions.filter((d) => d.category === cat);
    if (group.length === 0) continue;
    lines.push(`### ${cat}`, "");
    for (const row of group) {
      const ind = row.retrievalQualityIndicators;
      lines.push(
        `#### ${row.title}`,
        "",
        `- **videoId:** \`${row.videoId}\``,
        `- **channel:** ${row.channel}`,
        `- **category:** ${row.category}`,
        `- **YouTube:** ${row.youtubeUrl}`,
        `- **profile:** ${profilePositionLine(row.profilePosition)}`,
        `- **target topics:** ${row.targetTopics.length ? row.targetTopics.map((t) => `\`${t}\``).join(", ") : "—"}`,
        `- **source quality:** ${row.sourceQualityScore ?? "—"} (${row.sourceQualityTier ?? "—"})`,
        `- **predicted strengths:** ${row.predictedStrengths.join("; ") || "—"}`,
        `- **predicted risks:** ${row.predictedRisks.join("; ") || "—"}`,
        `- **why review:** ${row.whyHumanReviewNeeded}`,
        `- **retrieval tier / overall:** ${ind.retrievalTier ?? "—"} / ${fmtNum(ind.retrievalOverall)}`,
        `- **dims (0–1):** explanation=${fmtNum(ind.explanationDensity)} citation=${fmtNum(ind.citationRichness)} tutorial=${fmtNum(ind.actionableTutorialDensity)} technical=${fmtNum(ind.technicalTerminologyDensity)} clip=${fmtNum(ind.clipExtractionQuality)} semantic=${fmtNum(ind.semanticMomentYield)}`,
        `- **flags:** shallow_authority=${ind.shallowAuthorityFlag} poison=${ind.transcriptPoisonFlags.length ? ind.transcriptPoisonFlags.join(", ") : "none"} governance=${ind.governanceFlags.length ? ind.governanceFlags.join("; ") : "none"}`,
        `- **decision:** \`${row.decision}\``,
        `- **reviewer notes:** ${row.reviewerNotes.trim() || "_(empty)_"}`,
        ""
      );
    }
  }

  lines.push(
    "## Workflow",
    "",
    "1. Edit decisions in `data/wave-1-human-review-decisions.json` (`decision`, `reviewerNotes`).",
    "2. Run `npm run prepare:wave-1-review` to refresh this document.",
    "3. Run `npm run validate:wave-1-review` before any ingest command.",
    ""
  );

  return lines.join("\n");
}
