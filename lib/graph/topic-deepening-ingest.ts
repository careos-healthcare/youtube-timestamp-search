/**
 * Topic-deepening controlled ingest — one topic at a time from topic-deepening-queue.json.
 * No global wave queue; no broad crawl.
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
import { loadPublicMoments } from "@/lib/moments/load-public-moments";

import {
  buildTopicDeepeningFromDisk,
  type TopicDeepeningAnalysis,
  type TopicDeepeningQueueRow,
  type TopicDeepeningStatus,
} from "./topic-deepening";

export const TOPIC_DEEPENING_RAG_SLUG = "rag";
export const TOPIC_DEEPENING_RAG_QUEUE_SOURCE = "topic-deepening-rag";

export type TopicDeepeningQueueFile = {
  generatedAt?: string;
  queue: TopicDeepeningQueueRow[];
  analyses?: TopicDeepeningAnalysis[];
};

export type TopicDeepeningRagApproval = {
  version: 1;
  topicSlug: typeof TOPIC_DEEPENING_RAG_SLUG;
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

export type RagIngestPlan = {
  topicSlug: string;
  queueRow: TopicDeepeningQueueRow;
  candidates: Wave1PlanCandidate[];
  videoIds: string[];
  approval: TopicDeepeningRagApproval;
};

export type RagIngestOutcome = {
  generatedAt: string;
  topicSlug: string;
  plan: RagIngestPlan;
  ingestion: Wave1IngestionRunResult;
  worker?: { processed: number; indexed: number; skipped: number; failed: number; rejected: number };
  researchGradeBefore: {
    tier: string;
    distanceToElite: number;
    topicTrustScore: number;
    researchGradeScore: number;
    momentCount: number;
  } | null;
  researchGradeAfter: {
    tier: string;
    distanceToElite: number;
    topicTrustScore: number;
    researchGradeScore: number;
    momentCount: number;
  } | null;
  deepeningStatusBefore: TopicDeepeningStatus | null;
  deepeningStatusAfter: TopicDeepeningStatus | null;
  readyToShowcase: boolean;
  notes: string[];
};

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

export function loadRagApproval(root = process.cwd()): TopicDeepeningRagApproval | null {
  return loadJson<TopicDeepeningRagApproval>(
    join(root, "data", "topic-deepening-rag-approval.json")
  );
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
  const prior = loadJson<RagIngestOutcome>(join(root, "data", "topic-deepening-rag-ingest-result.json"));
  if (prior?.plan.topicSlug === topicSlug) return prior.plan.queueRow;
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
  root = process.cwd()
): Wave1PlanCandidate[] {
  const wavePath = join(root, "data", "ingestion-wave-1-candidates.json");
  if (!existsSync(wavePath)) return [];
  const plan = loadWave1PlanFile(wavePath);
  const all = plan.candidates ?? [];
  const waveIds = new Set(
    row.candidateSourceIds.filter((id) => id.startsWith("w1-"))
  );
  const videoIds = new Set(row.candidateVideoIds);
  const matched = all.filter(
    (c) => waveIds.has(c.id) || videoIds.has(c.videoId)
  );
  const cap =
    row.maxRecommendedIngestCount > 0
      ? row.maxRecommendedIngestCount
      : Math.max(row.candidateVideoIds.length, matched.length);
  return matched.slice(0, cap);
}

export function buildRagIngestApproval(
  row: TopicDeepeningQueueRow,
  candidates: Wave1PlanCandidate[]
): TopicDeepeningRagApproval {
  return {
    version: 1,
    topicSlug: TOPIC_DEEPENING_RAG_SLUG,
    approvedAt: new Date().toISOString(),
    governance: {
      basis: "topic-deepening-queue.json",
      overridesWave1ManualReview: true,
      reason:
        "Controlled topic-deepening batch for RAG only; wave-1 shortlist decisions remain needs_more_context globally but this batch is scoped to queue row priority 149.",
    },
    approvedVideoIds: candidates.map((c) => c.videoId),
    approvedWaveCandidateIds: candidates.map((c) => c.id),
    maxIngestCount: row.maxRecommendedIngestCount,
  };
}

export function buildRagIngestPlan(root = process.cwd()): RagIngestPlan {
  const row = loadTopicDeepeningQueueRow(TOPIC_DEEPENING_RAG_SLUG, root);
  if (!row) {
    throw new Error(`No queue row for topic "${TOPIC_DEEPENING_RAG_SLUG}" in data/topic-deepening-queue.json`);
  }
  if (row.currentStatus === "broken_do_not_promote") {
    throw new Error(`Topic ${TOPIC_DEEPENING_RAG_SLUG} is broken_do_not_promote — aborting ingest`);
  }
  let candidates = resolveWaveCandidatesForQueueRow(row, root);
  if (!candidates.length) {
    const prior = loadJson<RagIngestOutcome>(
      join(root, "data", "topic-deepening-rag-ingest-result.json")
    );
    candidates = prior?.plan.candidates ?? [];
  }
  if (!candidates.length) {
    throw new Error(`No wave-1 candidates resolved for ${TOPIC_DEEPENING_RAG_SLUG} queue row`);
  }
  return {
    topicSlug: TOPIC_DEEPENING_RAG_SLUG,
    queueRow: row,
    candidates,
    videoIds: candidates.map((c) => c.videoId),
    approval: buildRagIngestApproval(row, candidates),
  };
}

/** Tag pending seed jobs for approved video IDs with topic-deepening topic string. */
export function patchSeedQueueTopicsForRag(videoIds: string[], root = process.cwd()) {
  const def = getHighSignalTopicBySlug(TOPIC_DEEPENING_RAG_SLUG);
  const topicStr = def
    ? [TOPIC_DEEPENING_RAG_SLUG, ...def.topicHubSlugs].slice(0, 5).join(", ")
    : TOPIC_DEEPENING_RAG_SLUG;
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

function ragResearchGradeSlice(moments: ReturnType<typeof loadPublicMoments>) {
  const report = buildResearchGradeTopicReport(moments);
  const row = report.topics.find((t) => t.canonicalSlug === TOPIC_DEEPENING_RAG_SLUG);
  if (!row) return null;
  return {
    tier: row.tier,
    distanceToElite: row.distanceToElite,
    topicTrustScore: row.metrics.topicTrustScore,
    researchGradeScore: row.metrics.researchGradeScore,
    momentCount: row.metrics.momentCount,
  };
}

export type RunRagTopicDeepeningIngestOptions = {
  dryRun: boolean;
  reportOnly: boolean;
  skipVerify: boolean;
  writeQueue: boolean;
  ingest: boolean;
  root?: string;
  checkDelayMs?: number;
};

export async function runRagTopicDeepeningIngest(
  options: RunRagTopicDeepeningIngestOptions
): Promise<RagIngestOutcome> {
  const root = options.root ?? process.cwd();
  const plan = buildRagIngestPlan(root);
  const approvalPath = join(root, "data", "topic-deepening-rag-approval.json");
  writeFileSync(approvalPath, JSON.stringify(plan.approval, null, 2), "utf-8");

  const momentsBefore = loadPublicMoments();
  const gradeBefore = ragResearchGradeSlice(momentsBefore);
  let deepeningBefore: TopicDeepeningStatus | null = null;
  try {
    deepeningBefore =
      buildTopicDeepeningFromDisk(momentsBefore, root).analyses.find(
        (a) => a.topicSlug === TOPIC_DEEPENING_RAG_SLUG
      )?.status ?? null;
  } catch {
    // graph artifacts optional for before snapshot
  }

  const ingestion = await runWave1IngestionWithCandidates(plan.candidates, {
    dryRun: options.dryRun,
    reportOnly: options.reportOnly,
    skipVerify: options.skipVerify,
    writeQueue: options.writeQueue,
    limit: plan.candidates.length,
    start: 0,
    checkDelayMs: options.checkDelayMs,
    dataDir: join(root, "data"),
    queueSource: TOPIC_DEEPENING_RAG_QUEUE_SOURCE,
    toSeedInput: (c) => topicDeepeningToSeedInput(c, TOPIC_DEEPENING_RAG_SLUG),
  });

  const notes: string[] = [];
  if (ingestion.stopReason) notes.push(ingestion.stopReason);

  let worker: RagIngestOutcome["worker"];
  const writesAllowed =
    options.writeQueue &&
    !options.reportOnly &&
    !options.dryRun &&
    ingestion.transcriptGate.passed &&
    !ingestion.stopReason;

  if (writesAllowed) {
    const patched = patchSeedQueueTopicsForRag(plan.videoIds, root);
    if (patched > 0) notes.push(`Patched topic field on ${patched} pending seed job(s).`);
  }

  if (options.ingest && writesAllowed) {
    const { runIngestionWorker } = await import("@/lib/ingestion-pipeline");
    const delayMs = Math.max(
      Number(process.env.CHECK_DELAY_MS ?? 1500),
      Number(process.env.SEED_DELAY_MS ?? 1500)
    );
    worker = await runIngestionWorker({
      limit: plan.videoIds.length,
      delayMs,
      videoIds: plan.videoIds,
    });
    notes.push(`Worker indexed ${worker.indexed} / processed ${worker.processed} for RAG batch.`);
  }

  const momentsAfter = loadPublicMoments();
  const gradeAfter = ragResearchGradeSlice(momentsAfter);
  let deepeningAfter: TopicDeepeningStatus | null = null;
  try {
    deepeningAfter =
      buildTopicDeepeningFromDisk(momentsAfter, root).analyses.find(
        (a) => a.topicSlug === TOPIC_DEEPENING_RAG_SLUG
      )?.status ?? null;
  } catch {
    notes.push("Re-run report:research-graph and report:topic-deepening after materialize for after deepening status.");
  }

  const readyToShowcase = deepeningAfter === "ready_to_showcase";

  return {
    generatedAt: new Date().toISOString(),
    topicSlug: TOPIC_DEEPENING_RAG_SLUG,
    plan,
    ingestion,
    worker,
    researchGradeBefore: gradeBefore,
    researchGradeAfter: gradeAfter,
    deepeningStatusBefore: deepeningBefore,
    deepeningStatusAfter: deepeningAfter,
    readyToShowcase,
    notes,
  };
}

/** Snapshot post-ingest / post-materialize metrics without re-running transcript checks. */
export function refreshRagIngestOutcome(root = process.cwd()): RagIngestOutcome {
  const plan = buildRagIngestPlan(root);
  const prior = loadJson<RagIngestOutcome>(join(root, "data", "topic-deepening-rag-ingest-result.json"));
  const moments = loadPublicMoments();
  const gradeAfter = ragResearchGradeSlice(moments);
  let deepeningAfter: TopicDeepeningStatus | null = null;
  try {
    deepeningAfter =
      buildTopicDeepeningFromDisk(moments, root).analyses.find(
        (a) => a.topicSlug === TOPIC_DEEPENING_RAG_SLUG
      )?.status ?? null;
  } catch {
    // optional
  }
  return {
    generatedAt: new Date().toISOString(),
    topicSlug: TOPIC_DEEPENING_RAG_SLUG,
    plan,
    ingestion:
      prior?.ingestion ??
      ({
        generatedAt: new Date().toISOString(),
        flags: {
          simulate: true,
          writesIntended: false,
          dryRun: true,
          reportOnly: true,
          skipVerify: true,
          writeQueue: false,
          limit: plan.candidates.length,
          start: 0,
        },
        transcriptGate: {
          checked: 0,
          available: 0,
          unavailable: 0,
          passed: true,
          minChecksForGate: 3,
          maxUnavailableRate: 0.5,
        },
        summary: {
          eligible: 0,
          alreadyIndexed: plan.candidates.length,
          cachedTranscript: 0,
          inSeedQueue: 0,
          inCorpusQueue: 0,
          csvExcluded: 0,
          unavailableTranscript: 0,
          queued: 0,
          ingested: 0,
          failed: 0,
        },
        sourceQualitySummary: { meanScore: 100, tierCounts: { A: plan.candidates.length } },
        rows: [],
      } as Wave1IngestionRunResult),
    worker: prior?.worker,
    researchGradeBefore: prior?.researchGradeBefore ?? null,
    researchGradeAfter: gradeAfter,
    deepeningStatusBefore: prior?.deepeningStatusBefore ?? "deepen_next",
    deepeningStatusAfter: deepeningAfter,
    readyToShowcase: deepeningAfter === "ready_to_showcase",
    notes: [
      ...(prior?.notes ?? []),
      "Outcome refreshed from current corpus after materialize + governance reports.",
    ],
  };
}

export function formatRagIngestMarkdown(outcome: RagIngestOutcome): string {
  const lines: string[] = [
    "# Topic-deepening controlled ingest — RAG",
    "",
    `Generated: ${outcome.generatedAt}`,
    "",
    "## Governance",
    "",
    `- Queue basis: \`data/topic-deepening-queue.json\` (priority **${outcome.plan.queueRow.priority}**)`,
    `- Approval: \`data/topic-deepening-rag-approval.json\``,
    `- Seed queue source: \`${TOPIC_DEEPENING_RAG_QUEUE_SOURCE}\``,
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
  lines.push("## RAG research-grade delta");
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
    ""
  );
  if (outcome.notes.length) {
    lines.push("## Notes");
    lines.push("");
    for (const n of outcome.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("## Next steps");
  lines.push("");
  lines.push("1. `npm run materialize:public-moments` after worker indexes transcripts.");
  lines.push("2. `npm run report:research-graph` && `npm run report:topic-deepening` && `npm run report:research-grade-topics`.");
  lines.push("3. Re-run this ingest script with `--report-only` to refresh outcome without writes.");
  lines.push("");
  return lines.join("\n");
}
