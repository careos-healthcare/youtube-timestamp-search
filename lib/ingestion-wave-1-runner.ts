import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { listQueue as listCorpusQueue } from "@/lib/corpus/ingestion-queue";
import { evaluatePublicMoment } from "@/lib/quality";
import { loadPublicMoments, resetPublicMomentsCache } from "@/lib/moments/load-public-moments";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { buildDedupSets, enqueueCandidates, loadQueue as loadSeedQueue } from "@/lib/ingestion-queue";
import { getIndexedVideoById } from "@/lib/indexed-videos";
import type { SeedTranscriptInput } from "@/lib/seed-transcript-ingestion";
import { checkTranscriptAvailability } from "@/lib/transcript-availability-check";
import { hasCachedTranscript } from "@/lib/transcript-cache";

import type { Wave1PlanCandidate } from "./ingestion-wave-1-validate";

export type Wave1RowStatus =
  | "eligible"
  | "already_indexed"
  | "cached_transcript"
  | "in_seed_queue"
  | "in_corpus_queue"
  | "csv_excluded"
  | "unavailable_transcript"
  | "queued"
  | "ingested"
  | "failed";

export type Wave1RowResult = {
  id: string;
  videoId: string;
  url: string;
  channelName: string;
  status: Wave1RowStatus;
  detail?: string;
  segmentCount?: number;
  expectedTopicCoverageGain?: string;
  sourceQualityScore?: number;
  sourceQualityTier?: string;
};

export type CorpusQualitySnapshot = {
  momentCount: number;
  uniqueVideos: number;
  uniqueCreators: number;
  lowTierShare: number;
  highTierShare: number;
  citeRichShare: number;
};

export type Wave1IngestionRunResult = {
  generatedAt: string;
  flags: {
    simulate: boolean;
    writesIntended: boolean;
    dryRun: boolean;
    reportOnly: boolean;
    skipVerify: boolean;
    writeQueue: boolean;
    ingest?: boolean;
    limit: number;
    start: number;
  };
  transcriptGate: {
    checked: number;
    available: number;
    unavailable: number;
    passed: boolean;
    minChecksForGate: number;
    maxUnavailableRate: number;
  };
  summary: {
    eligible: number;
    alreadyIndexed: number;
    cachedTranscript: number;
    inSeedQueue: number;
    inCorpusQueue: number;
    csvExcluded: number;
    unavailableTranscript: number;
    queued: number;
    ingested: number;
    failed: number;
  };
  sourceQualitySummary: {
    meanScore: number;
    tierCounts: Record<string, number>;
  };
  rows: Wave1RowResult[];
  enqueue?: { added: number; skippedDuplicate: number; skippedCached: number; skippedInQueue: number; availabilityRejected?: number };
  worker?: { processed: number; indexed: number; skipped: number; failed: number; rejected: number };
  corpusMetricsBefore?: CorpusQualitySnapshot;
  corpusMetricsAfter?: CorpusQualitySnapshot;
  proceedToRemaining31?: boolean;
  stopReason?: string;
};

const VIDEO_ID_IN_STRING = /\b([a-zA-Z0-9_-]{11})\b/g;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectVideoIdsFromCorpusQueues(): Set<string> {
  const ids = new Set<string>();
  for (const name of ["high_priority", "candidate", "requested"] as const) {
    for (const item of listCorpusQueue(name)) {
      const hay = `${item.dedupeKey ?? ""} ${item.url ?? ""} ${item.notes ?? ""}`;
      let m: RegExpExecArray | null;
      const re = new RegExp(VIDEO_ID_IN_STRING.source, "g");
      while ((m = re.exec(hay)) !== null) {
        ids.add(m[1]!);
      }
    }
  }
  return ids;
}

function seedCategoryFromAllowlist(cat?: string): string {
  switch (cat) {
    case "ai_research":
    case "ml_engineering":
    case "university_lectures":
      return "AI podcasts";
    case "startup_founder":
      return "business interviews";
    case "backend_devops":
    case "programming_tutorials":
    case "conference_talks":
      return "programming tutorials";
    default:
      return "AI podcasts";
  }
}

function priorityFromScore(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score / 22)));
}

export function wave1ToSeedInput(c: Wave1PlanCandidate): SeedTranscriptInput {
  return {
    videoId: c.videoId,
    url: c.url,
    category: seedCategoryFromAllowlist(c.allowlistCategory),
    creator: c.channelName,
    topic: c.targetTopics.slice(0, 4).join(", "),
    priority: priorityFromScore(c.sourceQuality?.score ?? 70),
  };
}

export function snapshotCorpusQuality(moments: PublicMomentRecord[]): CorpusQualitySnapshot {
  const videoIds = new Set(moments.map((m) => m.videoId));
  const creators = new Set(moments.map((m) => m.channelName).filter(Boolean) as string[]);
  let low = 0;
  let high = 0;
  let cite = 0;
  for (const m of moments) {
    const t = evaluatePublicMoment(m).qualityTier;
    if (t === "low") low += 1;
    if (t === "high") high += 1;
    const s = m.semantic;
    if (s?.citations && (s.citations.markdown?.length || s.citations.academic?.length)) cite += 1;
  }
  const n = moments.length || 1;
  return {
    momentCount: moments.length,
    uniqueVideos: videoIds.size,
    uniqueCreators: creators.size,
    lowTierShare: low / n,
    highTierShare: high / n,
    citeRichShare: cite / n,
  };
}

export type RunWave1Options = {
  dryRun: boolean;
  reportOnly: boolean;
  skipVerify: boolean;
  writeQueue: boolean;
  limit: number;
  start: number;
  checkDelayMs?: number;
  dataDir?: string;
  /** Seed queue source label (default `wave-1`). */
  queueSource?: string;
  /** Map wave candidate → seed job (default `wave1ToSeedInput`). */
  toSeedInput?: (c: Wave1PlanCandidate) => SeedTranscriptInput;
};

const GATE_MIN_CHECKS = 3;
const GATE_MAX_UNAVAILABLE_RATE = 0.5;

export async function runWave1IngestionWithCandidates(
  allCandidates: Wave1PlanCandidate[],
  options: RunWave1Options
): Promise<Wave1IngestionRunResult> {
  const checkDelayMs = options.checkDelayMs ?? Number(process.env.CHECK_DELAY_MS ?? 1500);
  const dataDir = options.dataDir ?? join(process.cwd(), "data");
  const queueSource = options.queueSource ?? "wave-1";
  const toSeed = options.toSeedInput ?? wave1ToSeedInput;

  const window = allCandidates.slice(options.start, options.start + options.limit);
  const moments = loadPublicMoments();
  const publicVideoIds = new Set(moments.map((m) => m.videoId));
  const dedup = await buildDedupSets({ dataDir });
  const seedQueue = loadSeedQueue();
  const corpusVid = collectVideoIdsFromCorpusQueues();

  const completedOrPending = new Set(
    seedQueue.jobs
      .filter((j) => j.status !== "rejected" && j.status !== "failed")
      .map((j) => j.videoId)
  );

  const rows: Wave1RowResult[] = [];
  let eligible = 0;
  let alreadyIndexed = 0;
  let cachedTranscript = 0;
  let inSeedQueue = 0;
  let inCorpusQueue = 0;
  let csvExcluded = 0;
  let unavailableTranscript = 0;
  let queued = 0;
  const ingested = 0;
  const failed = 0;

  let transcriptChecked = 0;
  let transcriptAvailable = 0;
  let transcriptUnavailable = 0;

  const seedsToMaybeQueue: Wave1PlanCandidate[] = [];

  for (let idx = 0; idx < window.length; idx += 1) {
    const c = window[idx]!;
    const base: Wave1RowResult = {
      id: c.id,
      videoId: c.videoId,
      url: c.url,
      channelName: c.channelName,
      status: "eligible",
      expectedTopicCoverageGain: c.expectedTopicCoverageGain,
      sourceQualityScore: c.sourceQuality.score,
      sourceQualityTier: c.sourceQuality.tier,
    };

    if (dedup.csvExcluded.has(c.videoId)) {
      rows.push({ ...base, status: "csv_excluded", detail: "Excluded by seed CSV policy" });
      csvExcluded += 1;
      continue;
    }

    if (corpusVid.has(c.videoId)) {
      rows.push({ ...base, status: "in_corpus_queue", detail: "Referenced in corpus ingestion queue file" });
      inCorpusQueue += 1;
      continue;
    }

    if (completedOrPending.has(c.videoId)) {
      rows.push({ ...base, status: "in_seed_queue", detail: "Present in data/ingestion queue.json" });
      inSeedQueue += 1;
      continue;
    }

    if (publicVideoIds.has(c.videoId)) {
      rows.push({ ...base, status: "already_indexed", detail: "Public moments exist for videoId" });
      alreadyIndexed += 1;
      continue;
    }

    const indexed = await getIndexedVideoById(c.videoId);
    if (indexed) {
      rows.push({ ...base, status: "already_indexed", detail: "Indexed transcript record (cache or store)" });
      alreadyIndexed += 1;
      continue;
    }

    if (dedup.cached.has(c.videoId) || (await hasCachedTranscript(c.videoId))) {
      rows.push({ ...base, status: "cached_transcript", detail: "Transcript cache hit — worker would skip enqueue" });
      cachedTranscript += 1;
      continue;
    }

    if (!options.skipVerify) {
      const av = await checkTranscriptAvailability(toSeed(c));
      transcriptChecked += 1;
      if (av.available) {
        transcriptAvailable += 1;
        base.segmentCount = av.segmentCount;
      } else {
        transcriptUnavailable += 1;
        rows.push({
          ...base,
          status: "unavailable_transcript",
          detail: av.reason ?? "unavailable",
        });
        unavailableTranscript += 1;
        continue;
      }
      if (idx < window.length - 1 && checkDelayMs > 0) {
        await sleep(checkDelayMs);
      }
    }

    eligible += 1;
    seedsToMaybeQueue.push(c);
    rows.push({ ...base, status: "eligible", detail: options.skipVerify ? "verify skipped" : "transcript ok" });
  }

  const denom = transcriptAvailable + transcriptUnavailable;
  const unavailableRate = denom > 0 ? transcriptUnavailable / denom : 0;
  const transcriptGatePassed =
    options.skipVerify ||
    transcriptChecked < GATE_MIN_CHECKS ||
    unavailableRate <= GATE_MAX_UNAVAILABLE_RATE;

  const tierCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let scoreSum = 0;
  for (const c of window) {
    const t = c.sourceQuality.tier;
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
    scoreSum += c.sourceQuality.score;
  }
  const meanScore = window.length ? scoreSum / window.length : 0;

  let enqueue: Wave1IngestionRunResult["enqueue"];
  let corpusMetricsBefore: CorpusQualitySnapshot | undefined;
  let corpusMetricsAfter: CorpusQualitySnapshot | undefined;
  let qualityStop: string | undefined;
  let gateStop: string | undefined;
  if (!transcriptGatePassed) {
    gateStop = `Transcript gate failed: ${transcriptUnavailable}/${denom} unavailable (max rate ${GATE_MAX_UNAVAILABLE_RATE})`;
  }

  const writesIntended = options.writeQueue && !options.reportOnly && !options.dryRun;
  const allowWrites = writesIntended && !gateStop;

  if (allowWrites) {
    corpusMetricsBefore = snapshotCorpusQuality(loadPublicMoments());
  }

  if (options.writeQueue && allowWrites) {
    const cap = Math.min(seedsToMaybeQueue.length, options.limit);
    const batchCandidates = seedsToMaybeQueue.slice(0, cap);
    const batch = batchCandidates.map(toSeed);
    enqueue = await enqueueCandidates(batch, {
      source: queueSource,
      dataDir,
    });
    queued = enqueue.added;

    const qAfter = loadSeedQueue();
    for (const r of rows) {
      if (r.status !== "eligible") continue;
      if (!batch.some((s) => s.videoId === r.videoId)) continue;
      const job = qAfter.jobs.find((j) => j.videoId === r.videoId && j.source === queueSource);
      if (job) r.status = "queued";
    }
  }

  const simulate = !writesIntended;

  if (allowWrites && corpusMetricsBefore) {
    resetPublicMomentsCache();
    corpusMetricsAfter = snapshotCorpusQuality(loadPublicMoments());
    const lowAfter = corpusMetricsAfter.lowTierShare;
    const lowBefore = corpusMetricsBefore.lowTierShare;
    if (lowAfter > lowBefore + 0.03) {
      qualityStop = `Low-tier share increased materially (${lowBefore.toFixed(3)} → ${lowAfter.toFixed(3)}); pause further Wave 1 live ingests.`;
    }
  }

  const stopReason = qualityStop ?? gateStop;

  const proceedToRemaining31 =
    Boolean(transcriptGatePassed) &&
    !gateStop &&
    !qualityStop &&
    (corpusMetricsAfter?.lowTierShare ?? corpusMetricsBefore?.lowTierShare ?? 0) <=
      (corpusMetricsBefore?.lowTierShare ?? 1) + 0.02;

  return {
    generatedAt: new Date().toISOString(),
    flags: {
      simulate,
      writesIntended,
      dryRun: simulate,
      reportOnly: options.reportOnly,
      skipVerify: options.skipVerify,
      writeQueue: options.writeQueue,
      ingest: false,
      limit: options.limit,
      start: options.start,
    },
    transcriptGate: {
      checked: transcriptChecked,
      available: transcriptAvailable,
      unavailable: transcriptUnavailable,
      passed: transcriptGatePassed,
      minChecksForGate: GATE_MIN_CHECKS,
      maxUnavailableRate: GATE_MAX_UNAVAILABLE_RATE,
    },
    summary: {
      eligible,
      alreadyIndexed,
      cachedTranscript,
      inSeedQueue,
      inCorpusQueue,
      csvExcluded,
      unavailableTranscript,
      queued,
      ingested,
      failed,
    },
    sourceQualitySummary: { meanScore, tierCounts },
    rows,
    enqueue,
    corpusMetricsBefore,
    corpusMetricsAfter,
    proceedToRemaining31,
    stopReason,
  };
}

export function writeWave1MarkdownReport(result: Wave1IngestionRunResult, path: string, title: string) {
  const s = result.summary;
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push("");
  lines.push("## Flags");
  lines.push("");
  lines.push(`| simulate | writesIntended | dryRun | reportOnly | skipVerify | writeQueue | ingest | limit | start |`);
  lines.push(`|----------|----------------|--------|------------|------------|------------|--------|------:|------:|`);
  lines.push(
    `| ${result.flags.simulate} | ${result.flags.writesIntended} | ${result.flags.dryRun} | ${result.flags.reportOnly} | ${result.flags.skipVerify} | ${result.flags.writeQueue} | ${result.flags.ingest ?? false} | ${result.flags.limit} | ${result.flags.start} |`
  );
  lines.push("");
  lines.push("## Transcript gate");
  lines.push("");
  lines.push(`| checked | available | unavailable | passed |`);
  lines.push(`|--------:|----------:|--------------:|--------|`);
  lines.push(
    `| ${result.transcriptGate.checked} | ${result.transcriptGate.available} | ${result.transcriptGate.unavailable} | ${result.transcriptGate.passed} |`
  );
  lines.push("");
  lines.push("## Summary counts");
  lines.push("");
  lines.push(
    "| eligible | already_indexed | cached_transcript | in_seed_queue | in_corpus_queue | csv_excluded | unavailable_transcript | queued | ingested | failed |"
  );
  lines.push(
    "|---------:|----------------:|------------------:|--------------:|----------------:|-------------:|-------------------------:|-------:|---------:|-------:|"
  );
  lines.push(
    `| ${s.eligible} | ${s.alreadyIndexed} | ${s.cachedTranscript} | ${s.inSeedQueue} | ${s.inCorpusQueue} | ${s.csvExcluded} | ${s.unavailableTranscript} | ${s.queued} | ${s.ingested} | ${s.failed} |`
  );
  lines.push("");
  lines.push("## Source quality (window)");
  lines.push("");
  lines.push(`- Mean score: ${result.sourceQualitySummary.meanScore.toFixed(1)}`);
  lines.push(`- Tier counts: ${JSON.stringify(result.sourceQualitySummary.tierCounts)}`);
  lines.push("");
  if (result.enqueue) {
    lines.push("## Enqueue");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(result.enqueue, null, 2));
    lines.push("```");
    lines.push("");
  }
  if (result.worker) {
    lines.push("## Worker");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(result.worker, null, 2));
    lines.push("```");
    lines.push("");
  }
  if (result.corpusMetricsBefore || result.corpusMetricsAfter) {
    lines.push("## Corpus quality snapshots");
    lines.push("");
    lines.push("```json");
    lines.push(
      JSON.stringify({ before: result.corpusMetricsBefore, after: result.corpusMetricsAfter }, null, 2)
    );
    lines.push("```");
    lines.push("");
  }
  if (result.stopReason) {
    lines.push("## Stop / caution");
    lines.push("");
    lines.push(result.stopReason);
    lines.push("");
  }
  lines.push("## Proceed to remaining 31?");
  lines.push("");
  lines.push(String(result.proceedToRemaining31 ?? "n/a"));
  lines.push("");
  lines.push("## Per-row");
  lines.push("");
  lines.push("| id | videoId | status | detail |");
  lines.push("|:---|:--------|:-------|:-------|");
  for (const r of result.rows) {
    lines.push(`| ${r.id} | ${r.videoId} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "/")} |`);
  }
  lines.push("");
  writeFileSync(path, lines.join("\n"), "utf-8");
}
