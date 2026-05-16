/**
 * Topic-deepening controlled ingest — one topic at a time from topic-deepening-queue.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildResearchGradeTopicReport } from "@/lib/corpus/topic-research-grade";
import { getHighSignalTopicBySlug } from "@/lib/corpus/high-signal-topics";
import {
  getIngestionQueuePaths,
  loadQueue,
  saveQueue,
  type IngestionJob,
} from "@/lib/ingestion-queue";
import { loadWave1PlanFile, type Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import {
  runWave1IngestionWithCandidates,
  wave1ToSeedInput,
  type Wave1IngestionRunResult,
} from "@/lib/ingestion-wave-1-runner";
import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { loadPublicMoments, resetPublicMomentsCache } from "@/lib/moments/load-public-moments";

import {
  buildTopicDeepeningFromDisk,
  type TopicDeepeningAnalysis,
  type TopicDeepeningQueueRow,
  type TopicDeepeningStatus,
} from "./topic-deepening";

export const TOPIC_DEEPENING_RAG_SLUG = "rag";
export const TOPIC_DEEPENING_RAG_QUEUE_SOURCE = "topic-deepening-rag";

export function topicDeepeningQueueSource(topicSlug: string): string {
  return `topic-deepening-${topicSlug}`;
}

export type TopicDeepeningQueueFile = {
  generatedAt?: string;
  queue: TopicDeepeningQueueRow[];
  analyses?: TopicDeepeningAnalysis[];
};

export type TopicDeepeningIngestApproval = {
  version: 1;
  topicSlug: string;
  approvedAt: string;
  governance: {
    basis: "topic-deepening-queue.json";
    overridesWave1ManualReview: boolean;
    reason: string;
  };
  approvedVideoIds: string[];
  approvedWaveCandidateIds: string[];
  maxIngestCount: number;
};

export type TopicDeepeningIngestPlan = {
  topicSlug: string;
  queueRow: TopicDeepeningQueueRow;
  candidates: Wave1PlanCandidate[];
  videoIds: string[];
  approval: TopicDeepeningIngestApproval;
};

export type TopicDeepeningIngestOutcome = {
  generatedAt: string;
  topicSlug: string;
  plan: TopicDeepeningIngestPlan;
  ingestion: Wave1IngestionRunResult;
  worker?: { processed: number; indexed: number; skipped: number; failed: number; rejected: number };
  researchGradeBefore: ResearchGradeSlice | null;
  researchGradeAfter: ResearchGradeSlice | null;
  deepeningStatusBefore: TopicDeepeningStatus | null;
  deepeningStatusAfter: TopicDeepeningStatus | null;
  readyToShowcase: boolean;
  becameElite: boolean;
  notes: string[];
};

export type ResearchGradeSlice = {
  tier: string;
  distanceToElite: number;
  topicTrustScore: number;
  researchGradeScore: number;
  momentCount: number;
};

/** @deprecated Use TopicDeepeningIngestPlan */
export type RagIngestPlan = TopicDeepeningIngestPlan;
/** @deprecated Use TopicDeepeningIngestOutcome */
export type RagIngestOutcome = TopicDeepeningIngestOutcome;
/** @deprecated Use TopicDeepeningIngestApproval */
export type TopicDeepeningRagApproval = TopicDeepeningIngestApproval;

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function loadTopicDeepeningQueue(root = process.cwd()): TopicDeepeningQueueFile | null {
  return loadJson<TopicDeepeningQueueFile>(join(root, "data", "topic-deepening-queue.json"));
}

export function isTopicInDeepeningQueue(topicSlug: string, root = process.cwd()): boolean {
  return loadTopicDeepeningQueueRow(topicSlug, root) !== null;
}

function analysisToQueueRow(a: TopicDeepeningAnalysis): TopicDeepeningQueueRow {
  return {
    topicSlug: a.topicSlug,
    currentStatus: a.status,
    priority: a.priority,
    reason: a.reason,
    targetMissingCapabilities: a.targetMissingCapabilities,
    candidateVideoIds: a.ingestionCandidates
      .filter((c) => c.videoId)
      .map((c) => c.videoId as string),
    candidateSourceIds: a.ingestionCandidates.map((c) => c.id),
    maxRecommendedIngestCount: a.maxRecommendedIngestCount,
    riskLevel: a.riskLevel,
  };
}

export function loadTopicDeepeningQueueRow(
  topicSlug: string,
  root = process.cwd()
): TopicDeepeningQueueRow | null {
  const file = loadTopicDeepeningQueue(root);
  const fromQueue = file?.queue.find((q) => q.topicSlug === topicSlug);
  if (fromQueue) return fromQueue;
  const fromAnalysis = file?.analyses?.find((a) => a.topicSlug === topicSlug);
  if (fromAnalysis) return analysisToQueueRow(fromAnalysis);
  const prior = loadJson<TopicDeepeningIngestOutcome>(
    join(root, "data", `topic-deepening-${topicSlug}-ingest-result.json`)
  );
  if (prior?.plan.topicSlug === topicSlug) return prior.plan.queueRow;
  if (topicSlug === TOPIC_DEEPENING_RAG_SLUG) {
    const legacy = loadJson<TopicDeepeningIngestOutcome>(
      join(root, "data", "topic-deepening-rag-ingest-result.json")
    );
    if (legacy?.plan.topicSlug === topicSlug) return legacy.plan.queueRow;
  }
  return null;
}

export function topicDeepeningToSeedInput(
  c: Wave1PlanCandidate,
  topicSlug: string
): SeedTranscriptInput {
  const base = wave1ToSeedInput(c);
  const topics = [topicSlug, ...c.targetTopics.filter((t) => t !== topicSlug)];
  return {
    ...base,
    topic: topics.slice(0, 5).join(", "),
  };
}

export function resolveWaveCandidatesForQueueRow(
  row: TopicDeepeningQueueRow,
  root = process.cwd(),
  maxCandidates = 3
): Wave1PlanCandidate[] {
  const wavePath = join(root, "data", "ingestion-wave-1-candidates.json");
  if (!existsSync(wavePath)) return [];
  const plan = loadWave1PlanFile(wavePath);
  const all = plan.candidates ?? [];
  const waveIds = new Set(row.candidateSourceIds.filter((id) => id.startsWith("w1-")));
  const videoIds = new Set(row.candidateVideoIds);
  const matched = all.filter((c) => waveIds.has(c.id) || videoIds.has(c.videoId));
  const cap =
    maxCandidates > 0
      ? maxCandidates
      : row.maxRecommendedIngestCount > 0
        ? row.maxRecommendedIngestCount
        : Math.max(row.candidateVideoIds.length, matched.length);
  return matched.slice(0, cap);
}

export function buildTopicDeepeningIngestApproval(
  topicSlug: string,
  row: TopicDeepeningQueueRow,
  candidates: Wave1PlanCandidate[]
): TopicDeepeningIngestApproval {
  return {
    version: 1,
    topicSlug,
    approvedAt: new Date().toISOString(),
    governance: {
      basis: "topic-deepening-queue.json",
      overridesWave1ManualReview: true,
      reason: `Controlled topic-deepening batch for ${topicSlug}; scoped to queue row priority ${row.priority}.`,
    },
    approvedVideoIds: candidates.map((c) => c.videoId),
    approvedWaveCandidateIds: candidates.map((c) => c.id),
    maxIngestCount: row.maxRecommendedIngestCount,
  };
}

export type BuildTopicDeepeningIngestPlanOptions = {
  force?: boolean;
  maxCandidates?: number;
  root?: string;
};

export function buildTopicDeepeningIngestPlan(
  topicSlug: string,
  options: BuildTopicDeepeningIngestPlanOptions = {}
): TopicDeepeningIngestPlan {
  const root = options.root ?? process.cwd();
  const slug = topicSlug.trim().toLowerCase();

  if (!isTopicInDeepeningQueue(slug, root)) {
    throw new Error(
      `Topic "${slug}" is not in topic-deepening queue or analyses — run npm run report:topic-deepening`
    );
  }

  const row = loadTopicDeepeningQueueRow(slug, root);
  if (!row) {
    throw new Error(`No queue row for topic "${slug}" in data/topic-deepening-queue.json`);
  }

  if (row.currentStatus === "broken_do_not_promote") {
    throw new Error(`Topic ${slug} is broken_do_not_promote — aborting ingest`);
  }

  if (row.currentStatus === "ready_to_showcase" && !options.force) {
    throw new Error(
      `Topic ${slug} is ready_to_showcase — use --force to ingest anyway`
    );
  }

  const maxCandidates = options.maxCandidates ?? Math.min(3, row.maxRecommendedIngestCount || 3);
  let candidates = resolveWaveCandidatesForQueueRow(row, root, maxCandidates);

  if (!candidates.length) {
    const priorPath =
      slug === TOPIC_DEEPENING_RAG_SLUG
        ? join(root, "data", "topic-deepening-rag-ingest-result.json")
        : join(root, "data", `topic-deepening-${slug}-ingest-result.json`);
    const prior = loadJson<TopicDeepeningIngestOutcome>(priorPath);
    candidates = prior?.plan.candidates.slice(0, maxCandidates) ?? [];
  }

  if (!candidates.length) {
    throw new Error(`No wave-1 candidates resolved for ${slug} queue row`);
  }

  return {
    topicSlug: slug,
    queueRow: row,
    candidates,
    videoIds: candidates.map((c) => c.videoId),
    approval: buildTopicDeepeningIngestApproval(slug, row, candidates),
  };
}

export function buildRagIngestPlan(root = process.cwd()): TopicDeepeningIngestPlan {
  return buildTopicDeepeningIngestPlan(TOPIC_DEEPENING_RAG_SLUG, { root });
}

export function patchSeedQueueTopicsForDeepening(
  topicSlug: string,
  videoIds: string[],
  root = process.cwd()
) {
  const def = getHighSignalTopicBySlug(topicSlug);
  const topicStr = def
    ? [topicSlug, ...def.topicHubSlugs].slice(0, 5).join(", ")
    : topicSlug;
  const allow = new Set(videoIds);
  const paths = getIngestionQueuePaths(join(root, "data", "ingestion"));
  const queue = loadQueue(paths);
  let patched = 0;
  for (const job of queue.jobs) {
    if (!allow.has(job.videoId)) continue;
    if (job.status !== "pending" && job.status !== "failed") continue;
    (job as IngestionJob).topic = topicStr;
    patched += 1;
  }
  if (patched > 0) saveQueue(queue, paths);
  return patched;
}

export function patchSeedQueueTopicsForRag(videoIds: string[], root = process.cwd()) {
  return patchSeedQueueTopicsForDeepening(TOPIC_DEEPENING_RAG_SLUG, videoIds, root);
}

function researchGradeSlice(
  topicSlug: string,
  moments: ReturnType<typeof loadPublicMoments>
): ResearchGradeSlice | null {
  const report = buildResearchGradeTopicReport(moments);
  const row = report.topics.find((t) => t.canonicalSlug === topicSlug);
  if (!row) return null;
  return {
    tier: row.tier,
    distanceToElite: row.distanceToElite,
    topicTrustScore: row.metrics.topicTrustScore,
    researchGradeScore: row.metrics.researchGradeScore,
    momentCount: row.metrics.momentCount,
  };
}

export type RunTopicDeepeningIngestOptions = {
  dryRun: boolean;
  reportOnly: boolean;
  skipVerify: boolean;
  writeQueue: boolean;
  ingest: boolean;
  force?: boolean;
  maxCandidates?: number;
  maxLive?: number;
  root?: string;
  checkDelayMs?: number;
};

export async function runTopicDeepeningIngest(
  topicSlug: string,
  options: RunTopicDeepeningIngestOptions
): Promise<TopicDeepeningIngestOutcome> {
  const root = options.root ?? process.cwd();
  const slug = topicSlug.trim().toLowerCase();
  const plan = buildTopicDeepeningIngestPlan(slug, {
    force: options.force,
    maxCandidates: options.maxCandidates,
    root,
  });

  const approvalPath = join(root, "data", `topic-deepening-${slug}-approval.json`);
  writeFileSync(approvalPath, JSON.stringify(plan.approval, null, 2), "utf-8");
  if (slug === TOPIC_DEEPENING_RAG_SLUG) {
    writeFileSync(
      join(root, "data", "topic-deepening-rag-approval.json"),
      JSON.stringify(plan.approval, null, 2),
      "utf-8"
    );
  }

  const momentsBefore = loadPublicMoments();
  const gradeBefore = researchGradeSlice(slug, momentsBefore);
  let deepeningBefore: TopicDeepeningStatus | null = null;
  try {
    deepeningBefore =
      buildTopicDeepeningFromDisk(momentsBefore, root).analyses.find((a) => a.topicSlug === slug)
        ?.status ?? null;
  } catch {
    // optional
  }

  const maxLive = options.maxLive ?? plan.candidates.length;
  const candidateWindow = plan.candidates.slice(0, maxLive);

  const ingestion = await runWave1IngestionWithCandidates(candidateWindow, {
    dryRun: options.dryRun,
    reportOnly: options.reportOnly,
    skipVerify: options.skipVerify,
    writeQueue: options.writeQueue,
    limit: candidateWindow.length,
    start: 0,
    checkDelayMs: options.checkDelayMs,
    dataDir: join(root, "data"),
    queueSource: topicDeepeningQueueSource(slug),
    toSeedInput: (c) => topicDeepeningToSeedInput(c, slug),
  });

  const notes: string[] = [];
  if (ingestion.stopReason) notes.push(ingestion.stopReason);

  let worker: TopicDeepeningIngestOutcome["worker"];
  const writesAllowed =
    options.writeQueue &&
    !options.reportOnly &&
    !options.dryRun &&
    ingestion.transcriptGate.passed &&
    !ingestion.stopReason;

  if (writesAllowed) {
    const patched = patchSeedQueueTopicsForDeepening(slug, plan.videoIds, root);
    if (patched > 0) notes.push(`Patched topic field on ${patched} pending seed job(s).`);
  }

  if (options.ingest && writesAllowed) {
    const { runIngestionWorker } = await import("@/lib/ingestion-pipeline");
    const delayMs = Math.max(
      Number(process.env.CHECK_DELAY_MS ?? 1500),
      Number(process.env.SEED_DELAY_MS ?? 1500)
    );
    worker = await runIngestionWorker({
      limit: maxLive,
      delayMs,
      videoIds: plan.videoIds.slice(0, maxLive),
    });
    notes.push(`Worker indexed ${worker.indexed} / processed ${worker.processed} for ${slug} batch.`);
  }

  resetPublicMomentsCache();
  const momentsAfter = loadPublicMoments();
  const gradeAfter = researchGradeSlice(slug, momentsAfter);
  let deepeningAfter: TopicDeepeningStatus | null = null;
  try {
    deepeningAfter =
      buildTopicDeepeningFromDisk(momentsAfter, root).analyses.find((a) => a.topicSlug === slug)
        ?.status ?? null;
  } catch {
    notes.push("Re-run governance reports after materialize for after deepening status.");
  }

  return {
    generatedAt: new Date().toISOString(),
    topicSlug: slug,
    plan,
    ingestion,
    worker,
    researchGradeBefore: gradeBefore,
    researchGradeAfter: gradeAfter,
    deepeningStatusBefore: deepeningBefore,
    deepeningStatusAfter: deepeningAfter,
    readyToShowcase: deepeningAfter === "ready_to_showcase",
    becameElite: gradeAfter?.tier === "elite",
    notes,
  };
}

export async function runRagTopicDeepeningIngest(
  options: RunTopicDeepeningIngestOptions
): Promise<TopicDeepeningIngestOutcome> {
  return runTopicDeepeningIngest(TOPIC_DEEPENING_RAG_SLUG, options);
}

export function ingestResultPath(topicSlug: string, root = process.cwd()): string {
  const slug = topicSlug.trim().toLowerCase();
  if (slug === TOPIC_DEEPENING_RAG_SLUG) {
    return join(root, "data", "topic-deepening-rag-ingest-result.json");
  }
  return join(root, "data", `topic-deepening-${slug}-ingest-result.json`);
}

export function refreshTopicDeepeningIngestOutcome(
  topicSlug: string,
  root = process.cwd()
): TopicDeepeningIngestOutcome {
  const slug = topicSlug.trim().toLowerCase();
  const plan = buildTopicDeepeningIngestPlan(slug, { force: true, root });
  const prior = loadJson<TopicDeepeningIngestOutcome>(ingestResultPath(slug, root));
  const moments = loadPublicMoments();
  const gradeAfter = researchGradeSlice(slug, moments);
  let deepeningAfter: TopicDeepeningStatus | null = null;
  try {
    deepeningAfter =
      buildTopicDeepeningFromDisk(moments, root).analyses.find((a) => a.topicSlug === slug)
        ?.status ?? null;
  } catch {
    // optional
  }
  return {
    generatedAt: new Date().toISOString(),
    topicSlug: slug,
    plan,
    ingestion: prior?.ingestion ?? ({} as Wave1IngestionRunResult),
    worker: prior?.worker,
    researchGradeBefore: prior?.researchGradeBefore ?? null,
    researchGradeAfter: gradeAfter,
    deepeningStatusBefore: prior?.deepeningStatusBefore ?? null,
    deepeningStatusAfter: deepeningAfter,
    readyToShowcase: deepeningAfter === "ready_to_showcase",
    becameElite: gradeAfter?.tier === "elite",
    notes: [
      ...(prior?.notes ?? []),
      "Outcome refreshed from current corpus after materialize + governance reports.",
    ],
  };
}

export function refreshRagIngestOutcome(root = process.cwd()): TopicDeepeningIngestOutcome {
  return refreshTopicDeepeningIngestOutcome(TOPIC_DEEPENING_RAG_SLUG, root);
}

export function formatTopicDeepeningIngestMarkdown(outcome: TopicDeepeningIngestOutcome): string {
  const lines: string[] = [
    `# Topic-deepening controlled ingest — ${outcome.plan.queueRow.topicSlug}`,
    "",
    `Generated: ${outcome.generatedAt}`,
    "",
    "## Governance",
    "",
    `- Queue basis: \`data/topic-deepening-queue.json\` (priority **${outcome.plan.queueRow.priority}**)`,
    `- Approval: \`data/topic-deepening-${outcome.topicSlug}-approval.json\``,
    `- Seed queue source: \`${topicDeepeningQueueSource(outcome.topicSlug)}\``,
    `- Max ingest: **${outcome.plan.queueRow.maxRecommendedIngestCount}**`,
    "",
    "## Planned videos",
    "",
  ];
  for (const c of outcome.plan.candidates) {
    lines.push(`- **${c.id}** \`${c.videoId}\` — ${c.channelName}: ${c.videoTitle.slice(0, 72)}…`);
  }
  lines.push("");
  lines.push("## Ingestion run");
  lines.push("");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        summary: outcome.ingestion.summary,
        transcriptGate: outcome.ingestion.transcriptGate,
        stopReason: outcome.ingestion.stopReason,
        worker: outcome.worker,
      },
      null,
      2
    )
  );
  lines.push("```");
  lines.push("");
  lines.push("## Research-grade delta");
  lines.push("");
  lines.push("| | Before | After |");
  lines.push("| --- | --- | --- |");
  lines.push(
    `| Tier | ${outcome.researchGradeBefore?.tier ?? "—"} | ${outcome.researchGradeAfter?.tier ?? "—"} |`
  );
  lines.push(
    `| Distance to elite | ${outcome.researchGradeBefore?.distanceToElite?.toFixed(3) ?? "—"} | ${outcome.researchGradeAfter?.distanceToElite?.toFixed(3) ?? "—"} |`
  );
  lines.push(
    `| Trust score | ${outcome.researchGradeBefore?.topicTrustScore ?? "—"} | ${outcome.researchGradeAfter?.topicTrustScore ?? "—"} |`
  );
  lines.push(
    `| Moments | ${outcome.researchGradeBefore?.momentCount ?? "—"} | ${outcome.researchGradeAfter?.momentCount ?? "—"} |`
  );
  lines.push("");
  lines.push("## Deepening status");
  lines.push("");
  lines.push(
    `- Before: **${outcome.deepeningStatusBefore ?? "unknown"}**`,
    `- After: **${outcome.deepeningStatusAfter ?? "unknown"}**`,
    `- Showcase-ready: **${outcome.readyToShowcase ? "yes" : "no"}**`,
    `- Elite tier: **${outcome.becameElite ? "yes" : "no"}**`,
    ""
  );
  if (outcome.notes.length) {
    lines.push("## Notes");
    lines.push("");
    for (const n of outcome.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  return lines.join("\n");
}

export const formatRagIngestMarkdown = formatTopicDeepeningIngestMarkdown;

export function writeTopicDeepeningIngestArtifacts(
  outcome: TopicDeepeningIngestOutcome,
  root = process.cwd()
) {
  const slug = outcome.topicSlug;
  const jsonPath = ingestResultPath(slug, root);
  const mdPath =
    slug === TOPIC_DEEPENING_RAG_SLUG
      ? join(root, "TOPIC_DEEPENING_RAG_INGEST_REPORT.md")
      : join(root, `TOPIC_DEEPENING_${slug.toUpperCase().replace(/-/g, "_")}_INGEST_REPORT.md`);

  writeFileSync(jsonPath, JSON.stringify(outcome, null, 2), "utf-8");
  writeFileSync(mdPath, formatTopicDeepeningIngestMarkdown(outcome), "utf-8");
}
