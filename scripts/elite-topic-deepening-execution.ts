#!/usr/bin/env tsx
/**
 * Elite-topic deepening loop — program plan, dry-runs, single live ingest, execution report.
 *
 *   npm run elite-topic-deepening
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  buildEliteTopicProgram,
  writeEliteTopicProgramArtifacts,
  type EliteTopicProgram,
} from "@/lib/graph/elite-topic-program";
import {
  runTopicDeepeningIngest,
  type TopicDeepeningIngestOutcome,
} from "@/lib/graph/topic-deepening-ingest";

export type EliteTopicDeepeningResults = {
  generatedAt: string;
  program: EliteTopicProgram;
  dryRuns: Array<{
    topicSlug: string;
    summary: TopicDeepeningIngestOutcome["ingestion"]["summary"];
    transcriptGatePassed: boolean;
    stopReason?: string;
  }>;
  liveIngestTopic: string | null;
  ingestedVideoIds?: string[];
  liveIngest: TopicDeepeningIngestOutcome | null;
  loopRepeatable: boolean;
  loopNotes: string[];
  whatStayedWeak?: string[];
};

function formatExecutionMarkdown(results: EliteTopicDeepeningResults): string {
  const lines: string[] = [
    "# Elite topic deepening — execution report",
    "",
    `Generated: ${results.generatedAt}`,
    "",
    "## Milestone check",
    "",
    `- Already elite/showcase: ${results.program.alreadyEliteOrShowcase.join(", ") || "—"}`,
    `- Selected program topics: ${results.program.selectedTopics.map((t) => t.topicSlug).join(", ")}`,
    `- Live ingest topic: **${results.liveIngestTopic ?? "none"}**`,
    `- Loop appears repeatable: **${results.loopRepeatable ? "yes" : "no"}**`,
    "",
    "## Selected topics",
    "",
  ];
  for (const t of results.program.selectedTopics) {
    lines.push(
      `${t.selectionRank}. **${t.label}** (\`${t.topicSlug}\`) — ${t.currentStatus}, grade **${t.researchGradeTier}**, distance **${t.distanceToElite.toFixed(2)}**`
    );
  }
  lines.push("");
  lines.push("## Dry-run results", "");
  lines.push("| Topic | Eligible | Queued | Already | Gate | Stop |");
  lines.push("| --- | ---: | ---: | ---: | --- | --- |");
  for (const d of results.dryRuns) {
    lines.push(
      `| ${d.topicSlug} | ${d.summary.eligible} | ${d.summary.queued} | ${d.summary.alreadyIndexed} | ${d.transcriptGatePassed ? "pass" : "fail"} | ${d.stopReason ?? "—"} |`
    );
  }
  lines.push("");
  if (results.liveIngest) {
    const o = results.liveIngest;
    lines.push(`## Live ingest — ${o.topicSlug}`, "");
    lines.push("| Metric | Before | After |");
    lines.push("| --- | --- | --- |");
    lines.push(`| Tier | ${o.researchGradeBefore?.tier ?? "—"} | ${o.researchGradeAfter?.tier ?? "—"} |`);
    lines.push(
      `| Distance to elite | ${o.researchGradeBefore?.distanceToElite?.toFixed(3) ?? "—"} | ${o.researchGradeAfter?.distanceToElite?.toFixed(3) ?? "—"} |`
    );
    lines.push(`| Moments | ${o.researchGradeBefore?.momentCount ?? "—"} | ${o.researchGradeAfter?.momentCount ?? "—"} |`);
    lines.push(`| Deepening status | ${o.deepeningStatusBefore} | ${o.deepeningStatusAfter} |`);
    lines.push(`| Showcase-ready | — | **${o.readyToShowcase ? "yes" : "no"}** |`);
    lines.push(`| Elite tier | — | **${o.becameElite ? "yes" : "no"}** |`);
    lines.push("");
    if (results.ingestedVideoIds?.length) {
      lines.push(`**Ingested video IDs:** ${results.ingestedVideoIds.join(", ")}`);
      lines.push("");
    }
    if (o.worker) {
      lines.push(`Worker indexed **${o.worker.indexed}** video(s).`);
      lines.push("");
    }
  }
  lines.push("## Loop assessment", "");
  for (const n of results.loopNotes) lines.push(`- ${n}`);
  lines.push("");
  if (results.whatStayedWeak?.length) {
    lines.push("## What failed or stayed weak", "");
    for (const w of results.whatStayedWeak) lines.push(`- ${w}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  loadLocalEnv();
  const argv = process.argv.slice(2);
  const skipLive = argv.includes("--dry-run-only");
  const root = process.cwd();

  const program = buildEliteTopicProgram(root);
  writeEliteTopicProgramArtifacts(program, root);

  const dryRuns: EliteTopicDeepeningResults["dryRuns"] = [];
  const loopNotes: string[] = [];

  for (const entry of program.selectedTopics) {
    try {
      const outcome = await runTopicDeepeningIngest(entry.topicSlug, {
        dryRun: true,
        reportOnly: true,
        skipVerify: false,
        writeQueue: false,
        ingest: false,
        maxCandidates: entry.maxIngestCount,
        maxLive: entry.maxIngestCount,
      });
      dryRuns.push({
        topicSlug: entry.topicSlug,
        summary: outcome.ingestion.summary,
        transcriptGatePassed: outcome.ingestion.transcriptGate.passed,
        stopReason: outcome.ingestion.stopReason,
      });
    } catch (e) {
      dryRuns.push({
        topicSlug: entry.topicSlug,
        summary: {
          eligible: 0,
          alreadyIndexed: 0,
          cachedTranscript: 0,
          inSeedQueue: 0,
          inCorpusQueue: 0,
          csvExcluded: 0,
          unavailableTranscript: 0,
          queued: 0,
          ingested: 0,
          failed: 0,
        },
        transcriptGatePassed: false,
        stopReason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const primary = program.primaryLiveIngestTopic;
  const primaryDry = dryRuns.find((d) => d.topicSlug === primary);
  let liveIngest: TopicDeepeningIngestOutcome | null = null;

  if (!skipLive && primaryDry?.transcriptGatePassed) {
    loopNotes.push(`Live ingest targeting ${primary} (strongest queue row with wave videos).`);
    const liveRun = await runTopicDeepeningIngest(primary, {
      dryRun: false,
      reportOnly: false,
      skipVerify: false,
      writeQueue: true,
      ingest: true,
      maxCandidates: 3,
      maxLive: 3,
    });
    const gradeBefore = liveRun.researchGradeBefore;
    const deepeningBefore = liveRun.deepeningStatusBefore;
    const worker = liveRun.worker;
    const ingestion = liveRun.ingestion;
    const plan = liveRun.plan;

    liveIngest = liveRun;

    if (worker && worker.indexed > 0) {
      const videos = plan.videoIds.join(",");
      loopNotes.push(`Ingested videos: ${plan.videoIds.join(", ")}.`);
      execSync("npm run materialize:public-moments", {
        stdio: "inherit",
        env: {
          ...process.env,
          PUBLIC_MOMENTS_PRIORITIZE_VIDEO_IDS: videos,
          PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP: "80",
          PUBLIC_MOMENTS_MAX_TOTAL: "280",
        },
      });
      for (const script of [
        "report:research-graph",
        "report:research-grade-topics",
        "report:flagship-topics",
        "report:topic-deepening",
        "report:retrieval-calibration",
        "report:retrieval-quality",
      ]) {
        execSync(`npm run ${script}`, { stdio: "inherit" });
      }
      const { refreshTopicDeepeningIngestOutcome } = await import("@/lib/graph/topic-deepening-ingest");
      const after = refreshTopicDeepeningIngestOutcome(primary);
      liveIngest = {
        ...after,
        plan,
        ingestion,
        worker,
        researchGradeBefore: gradeBefore,
        deepeningStatusBefore: deepeningBefore,
        notes: [...liveRun.notes, ...after.notes],
      };
    }
  } else if (!primaryDry?.transcriptGatePassed) {
    loopNotes.push(`Skipped live ingest — transcript gate failed for ${primary}.`);
  }

  const ragElite = program.alreadyEliteOrShowcase.includes("rag");
  const secondElite =
    liveIngest?.becameElite ||
    liveIngest?.researchGradeAfter?.tier === "elite" ||
    liveIngest?.readyToShowcase ||
    program.alreadyEliteOrShowcase.length >= 2;

  const loopRepeatable =
    ragElite &&
    Boolean(secondElite) &&
    dryRuns.filter((d) => d.transcriptGatePassed).length >= 2;

  if (ragElite) loopNotes.push("RAG already elite/showcase from prior controlled ingest.");
  if (liveIngest?.becameElite) {
    loopNotes.push(`${primary} reached elite tier after live batch.`);
  } else if (liveIngest?.readyToShowcase) {
    loopNotes.push(`${primary} reached showcase-ready (may still be strong vs elite).`);
  } else if (liveIngest) {
    loopNotes.push(
      `${primary} improved but did not reach elite/showcase — likely needs another targeted batch or primary-source moments.`
    );
  }

  const results: EliteTopicDeepeningResults = {
    generatedAt: new Date().toISOString(),
    program,
    dryRuns,
    liveIngestTopic: liveIngest ? primary : null,
    ingestedVideoIds: liveIngest?.plan.videoIds,
    liveIngest,
    loopRepeatable,
    loopNotes,
    whatStayedWeak: loopRepeatable
      ? [
          "vector-databases, embeddings, prompt-engineering, ai-agents remain broken",
          "inference/nlp-fundamentals: allowlist-only ingest candidates",
        ]
      : ["Loop did not meet RAG + second-topic milestone"],
  };

  writeFileSync(
    join(root, "data", "elite-topic-deepening-results.json"),
    JSON.stringify(results, null, 2),
    "utf-8"
  );
  writeFileSync(
    join(root, "ELITE_TOPIC_DEEPENING_EXECUTION_REPORT.md"),
    formatExecutionMarkdown(results),
    "utf-8"
  );

  console.log("Wrote data/elite-topic-program.json");
  console.log("Wrote ELITE_TOPIC_PROGRAM_PLAN.md");
  console.log("Wrote data/elite-topic-deepening-results.json");
  console.log("Wrote ELITE_TOPIC_DEEPENING_EXECUTION_REPORT.md");
  console.log(`Loop repeatable: ${loopRepeatable}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
