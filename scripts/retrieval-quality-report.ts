#!/usr/bin/env tsx
/**
 * Phase 2D — Retrieval quality scoring calibration report + Wave 1 re-rank.
 *
 *   npm run report:retrieval-quality
 */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import { validateWave1CandidatesFile, type Wave1PlanCandidate } from "@/lib/ingestion-wave-1-validate";
import {
  buildIngestionPriorityScore,
  estimateSemanticYieldFromTranscriptShape,
  transcriptLengthQualityBand,
} from "@/lib/corpus/ingestion-priority";
import { estimateTranscriptHoursFromSegments } from "@/lib/corpus/retrieval-calibration";
import { computeResearchValueMetricsForMoments } from "@/lib/corpus/research-value-metrics";
import { scoreRetrievalQuality, type RetrievalQualityResult } from "@/lib/corpus/retrieval-quality";
import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import { getCachedTranscript, type CachedTranscriptSegment } from "@/lib/transcript-cache";

const CONCURRENCY = 8;

type VideoEvalRow = {
  videoId: string;
  channelName: string;
  segmentCount: number;
  transcriptHours: number | null;
  retrieval: RetrievalQualityResult;
  research: ReturnType<typeof computeResearchValueMetricsForMoments>;
  momentCount: number;
};

type ChannelAgg = {
  channelName: string;
  videoCount: number;
  momentCount: number;
  meanRetrievalNormalized: number;
  meanSemanticYieldDim: number;
  meanCitationDim: number;
  meanCitationsPerHour: number | null;
  videos: string[];
};

type Wave1RankedRow = Wave1PlanCandidate & {
  segmentCount: number;
  transcriptHours: number | null;
  retrievalQuality: RetrievalQualityResult;
  ingestionPriority: ReturnType<typeof buildIngestionPriorityScore>;
};

type EvaluationFile = {
  generatedAt: string;
  videos: VideoEvalRow[];
  channels: ChannelAgg[];
  rankings: {
    bestRetrievalSources: { channelName: string; meanRetrievalNormalized: number }[];
    weakestRetrievalSources: { channelName: string; meanRetrievalNormalized: number }[];
    highestSemanticYield: { channelName: string; meanSemanticYieldDim: number }[];
    highestCitationYield: { channelName: string; meanCitationDim: number }[];
    lowValueTranscriptPatterns: { id: string; matchCount: number }[];
  };
  wave1Ranked: Wave1RankedRow[];
};

function momentsByVideo(moments: ReturnType<typeof loadPublicMoments>) {
  const map = new Map<string, typeof moments>();
  for (const m of moments) {
    const list = map.get(m.videoId) ?? [];
    list.push(m);
    map.set(m.videoId, list);
  }
  return map;
}

function channelNorm(ch: string | undefined): string {
  const c = ch?.trim();
  return c && c.length > 0 ? c : "unknown_channel";
}

async function fetchTranscriptMap(videoIds: string[]) {
  const map = new Map<
    string,
    {
      segments: CachedTranscriptSegment[];
      hours: number | null;
      segmentCount: number;
      channelName?: string;
    }
  >();
  for (let i = 0; i < videoIds.length; i += CONCURRENCY) {
    const chunk = videoIds.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const t = await getCachedTranscript(id);
          if (!t?.segments?.length) {
            map.set(id, { segments: [], hours: null, segmentCount: 0, channelName: t?.channelName });
            return;
          }
          const hours = estimateTranscriptHoursFromSegments(t.segments);
          map.set(id, {
            segments: t.segments,
            hours,
            segmentCount: t.segments.length,
            channelName: t.channelName,
          });
        } catch {
          map.set(id, { segments: [], hours: null, segmentCount: 0 });
        }
      })
    );
  }
  return map;
}

function semanticDim(r: RetrievalQualityResult): number {
  return r.dimensions.find((d) => d.id === "semantic_moment_yield")?.normalized ?? 0;
}

function citationDim(r: RetrievalQualityResult): number {
  return r.dimensions.find((d) => d.id === "citation_richness")?.normalized ?? 0;
}

function aggregateChannels(videoRows: VideoEvalRow[]): ChannelAgg[] {
  const by = new Map<string, VideoEvalRow[]>();
  for (const v of videoRows) {
    const k = channelNorm(v.channelName);
    const list = by.get(k) ?? [];
    list.push(v);
    by.set(k, list);
  }
  const out: ChannelAgg[] = [];
  for (const [channelName, rows] of by) {
    const n = rows.length;
    const meanRetrievalNormalized = rows.reduce((s, r) => s + r.retrieval.overallNormalized, 0) / n;
    const meanSemanticYieldDim = rows.reduce((s, r) => s + semanticDim(r.retrieval), 0) / n;
    const meanCitationDim = rows.reduce((s, r) => s + citationDim(r.retrieval), 0) / n;
    const hoursVals = rows.map((r) => r.research.citationsPerTranscriptHour).filter((x): x is number => x != null);
    const meanCitationsPerHour =
      hoursVals.length > 0 ? hoursVals.reduce((a, b) => a + b, 0) / hoursVals.length : null;
    const momentCount = rows.reduce((s, r) => s + r.momentCount, 0);
    out.push({
      channelName,
      videoCount: n,
      momentCount,
      meanRetrievalNormalized,
      meanSemanticYieldDim,
      meanCitationDim,
      meanCitationsPerHour,
      videos: rows.map((r) => r.videoId),
    });
  }
  return out;
}

function heuristicMatchCounts(videoRows: VideoEvalRow[]) {
  const counts = new Map<string, number>();
  for (const v of videoRows) {
    for (const h of v.retrieval.rejectHeuristics) {
      if (!h.matched) continue;
      counts.set(h.id, (counts.get(h.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([id, matchCount]) => ({ id, matchCount }));
}

function formatQualityReportMd(eval_: EvaluationFile): string {
  const lines: string[] = [];
  lines.push("# Retrieval quality report");
  lines.push("");
  lines.push(`Generated: ${eval_.generatedAt}`);
  lines.push("");
  lines.push("## Best current sources (by mean retrieval normalized score)");
  lines.push("");
  lines.push("| Channel | Videos | Moments | mean retrieval | mean semantic dim | mean cite dim |");
  lines.push("|---------|-------:|--------:|---------------:|------------------:|----------------:|");
  for (const c of eval_.rankings.bestRetrievalSources.slice(0, 15)) {
    const row = eval_.channels.find((x) => x.channelName === c.channelName);
    lines.push(
      `| ${c.channelName} | ${row?.videoCount ?? "—"} | ${row?.momentCount ?? "—"} | ${c.meanRetrievalNormalized.toFixed(3)} | ${row != null ? row.meanSemanticYieldDim.toFixed(3) : "—"} | ${row != null ? row.meanCitationDim.toFixed(3) : "—"} |`
    );
  }
  lines.push("");
  lines.push("## Weakest current sources");
  lines.push("");
  lines.push("| Channel | mean retrieval |");
  lines.push("|---------|---------------:|");
  for (const c of eval_.rankings.weakestRetrievalSources.slice(0, 12)) {
    lines.push(`| ${c.channelName} | ${c.meanRetrievalNormalized.toFixed(3)} |`);
  }
  lines.push("");
  lines.push("## Highest semantic yield (dimension)");
  lines.push("");
  for (const c of eval_.rankings.highestSemanticYield.slice(0, 10)) {
    lines.push(`- **${c.channelName}** — ${c.meanSemanticYieldDim.toFixed(3)}`);
  }
  lines.push("");
  lines.push("## Highest citation yield (dimension)");
  lines.push("");
  for (const c of eval_.rankings.highestCitationYield.slice(0, 10)) {
    lines.push(`- **${c.channelName}** — ${c.meanCitationDim.toFixed(3)}`);
  }
  lines.push("");
  lines.push("## Low-value transcript patterns (reject heuristics, matched videos)");
  lines.push("");
  for (const p of eval_.rankings.lowValueTranscriptPatterns) {
    lines.push(`- \`${p.id}\`: ${p.matchCount} videos`);
  }
  lines.push("");
  return lines.join("\n");
}

function formatCalibrationMd(eval_: EvaluationFile): string {
  const lines: string[] = [];
  lines.push("# Retrieval quality — calibration summary");
  lines.push("");
  lines.push(`Generated: ${eval_.generatedAt}`);
  lines.push("");
  lines.push("## Strongest sources (current corpus)");
  lines.push("");
  for (const c of eval_.rankings.bestRetrievalSources.slice(0, 8)) {
    lines.push(`- **${c.channelName}** (mean retrieval ${c.meanRetrievalNormalized.toFixed(3)})`);
  }
  lines.push("");
  lines.push("## Weakest sources (deprioritize for scale, not necessarily delete)");
  lines.push("");
  for (const c of eval_.rankings.weakestRetrievalSources.slice(0, 8)) {
    lines.push(`- **${c.channelName}** (mean retrieval ${c.meanRetrievalNormalized.toFixed(3)})`);
  }
  lines.push("");
  lines.push("## Remaining Wave 1 batch");
  lines.push("");
  lines.push(
    "**Do not ingest all remaining 31 blindly.** Use `data/ingestion-wave-1-ranked.json` priority order, transcript gates, and per-video retrieval flags. Deprioritize rows with low `retrievalQuality.overallNormalized` or multiple matched reject heuristics until scoring improves."
  );
  lines.push("");
  lines.push("## Recommended ingestion ordering (top 12)");
  lines.push("");
  for (const r of eval_.wave1Ranked.slice(0, 12)) {
    lines.push(
      `- **${r.id}** ${r.videoId} (${r.channelName}) — priority ${r.ingestionPriority.priorityScore} retrieval ${r.retrievalQuality.overallNormalized.toFixed(3)} tier ${r.retrievalQuality.tier}`
    );
  }
  lines.push("");
  lines.push("## Scoring weaknesses / next improvements");
  lines.push("");
  lines.push(
    "- Join **product analytics** (saved clips, compare views, reformulated searches) to validate `researchValue` proxies."
  );
  lines.push(
    "- **Multi-speaker** detection is cue-length + line-pattern heuristics only — add diarization metadata when available."
  );
  lines.push(
    "- **Repeated phrase** uses bigram repetition; tune thresholds per genre (podcast vs lecture)."
  );
  lines.push(
    "- **Clip / semantic dimensions** are neutral when transcripts are not yet materialized — re-run after ingest."
  );
  lines.push("");
  lines.push("## Precision-over-scale rule");
  lines.push("");
  lines.push(
    "A smaller research-grade corpus beats a large mediocre one. If priority scores cluster low, pause expansion and fix sources or extraction before adding hours."
  );
  lines.push("");
  return lines.join("\n");
}

async function main() {
  loadLocalEnv();
  const moments = loadPublicMoments();
  const byVid = momentsByVideo(moments);
  const wave1 = await validateWave1CandidatesFile();

  const videoIds = [...new Set([...byVid.keys(), ...wave1.map((c) => c.videoId)])];
  const tmap = await fetchTranscriptMap(videoIds);

  const momentCountByChannel = new Map<string, number>();
  for (const m of moments) {
    const k = channelNorm(m.channelName);
    momentCountByChannel.set(k, (momentCountByChannel.get(k) ?? 0) + 1);
  }

  const videoRows: VideoEvalRow[] = [];
  for (const vid of videoIds) {
    const mm = byVid.get(vid) ?? [];
    const tr = tmap.get(vid)!;
    const segs = tr.segments.map((s) => ({ text: s.text, start: s.start, duration: s.duration }));
    const rq = scoreRetrievalQuality({
      videoId: vid,
      channelName: mm[0]?.channelName ?? tr.channelName,
      segments: segs.length ? segs : [{ text: "(no transcript text)", start: 0 }],
      momentsForVideo: mm.length ? mm : undefined,
      transcriptHours: tr.hours,
    });
    const research = computeResearchValueMetricsForMoments(mm, tr.hours);
    videoRows.push({
      videoId: vid,
      channelName: channelNorm(mm[0]?.channelName ?? tr.channelName),
      segmentCount: tr.segmentCount,
      transcriptHours: tr.hours,
      retrieval: rq,
      research,
      momentCount: mm.length,
    });
  }

  for (const row of videoRows) {
    if (row.channelName === "unknown_channel") {
      const tr = tmap.get(row.videoId);
      if (tr?.channelName) row.channelName = channelNorm(tr.channelName);
    }
  }

  const channels = aggregateChannels(videoRows);
  const sortedBest = [...channels].sort((a, b) => b.meanRetrievalNormalized - a.meanRetrievalNormalized);
  const sortedWeak = [...channels].sort((a, b) => a.meanRetrievalNormalized - b.meanRetrievalNormalized);
  const sortedSem = [...channels].sort((a, b) => b.meanSemanticYieldDim - a.meanSemanticYieldDim);
  const sortedCite = [...channels].sort((a, b) => b.meanCitationDim - a.meanCitationDim);

  const wave1Ranked: Wave1RankedRow[] = [];
  for (const c of wave1) {
    const t = tmap.get(c.videoId)!;
    const segs = t.segments.map((s) => ({ text: s.text, start: s.start, duration: s.duration }));
    const mm = byVid.get(c.videoId) ?? [];
    const rq = scoreRetrievalQuality({
      videoId: c.videoId,
      channelName: c.channelName,
      videoTitle: c.videoTitle,
      segments: segs.length ? segs : [{ text: c.videoTitle, start: 0 }],
      momentsForVideo: mm.length ? mm : undefined,
      transcriptHours: t.hours,
    });
    const ch = channelNorm(c.channelName);
    const dup = Math.min(1, (momentCountByChannel.get(ch) ?? 0) / 42);
    const diversity = 1 - dup * 0.85;
    const semEst = estimateSemanticYieldFromTranscriptShape(
      t.segmentCount > 0 ? t.segmentCount : Math.max(24, Math.floor((c.durationMinutesEstimate ?? 55) * 2.8)),
      c.durationMinutesEstimate
    );
    const lenBand = transcriptLengthQualityBand(t.segmentCount || 0, c.durationMinutesEstimate);
    const priority = buildIngestionPriorityScore({
      sourceQuality: c.sourceQuality,
      retrievalQuality: rq,
      topicCoverageGainText: c.expectedTopicCoverageGain,
      semanticYieldEstimate: semEst,
      corpusDiversityBonus: diversity,
      creatorDuplicationPenalty: dup,
      transcriptLengthQualityBand: lenBand,
      segmentCount: t.segmentCount,
    });
    wave1Ranked.push({
      ...c,
      segmentCount: t.segmentCount,
      transcriptHours: t.hours,
      retrievalQuality: rq,
      ingestionPriority: priority,
    });
  }

  wave1Ranked.sort((a, b) => b.ingestionPriority.priorityScore - a.ingestionPriority.priorityScore);

  const evalJson: EvaluationFile = {
    generatedAt: new Date().toISOString(),
    videos: videoRows,
    channels,
    rankings: {
      bestRetrievalSources: sortedBest.slice(0, 20).map((c) => ({
        channelName: c.channelName,
        meanRetrievalNormalized: c.meanRetrievalNormalized,
      })),
      weakestRetrievalSources: sortedWeak.slice(0, 15).map((c) => ({
        channelName: c.channelName,
        meanRetrievalNormalized: c.meanRetrievalNormalized,
      })),
      highestSemanticYield: sortedSem.slice(0, 15).map((c) => ({
        channelName: c.channelName,
        meanSemanticYieldDim: c.meanSemanticYieldDim,
      })),
      highestCitationYield: sortedCite.slice(0, 15).map((c) => ({
        channelName: c.channelName,
        meanCitationDim: c.meanCitationDim,
      })),
      lowValueTranscriptPatterns: heuristicMatchCounts(videoRows),
    },
    wave1Ranked,
  };

  const jsonPath = join(process.cwd(), "data", "retrieval-quality-evaluation.json");
  const mdPath = join(process.cwd(), "RETRIEVAL_QUALITY_REPORT.md");
  const calPath = join(process.cwd(), "RETRIEVAL_QUALITY_CALIBRATION_REPORT.md");
  const rankedPath = join(process.cwd(), "data", "ingestion-wave-1-ranked.json");

  writeFileSync(jsonPath, JSON.stringify(evalJson, null, 2), "utf-8");
  writeFileSync(mdPath, formatQualityReportMd(evalJson), "utf-8");
  writeFileSync(calPath, formatCalibrationMd(evalJson), "utf-8");
  writeFileSync(
    rankedPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt: evalJson.generatedAt,
        ranked: wave1Ranked.map((r) => ({
          id: r.id,
          videoId: r.videoId,
          channelName: r.channelName,
          videoTitle: r.videoTitle,
          priorityScore: r.ingestionPriority.priorityScore,
          retrievalOverall: r.retrievalQuality.overallNormalized,
          retrievalTier: r.retrievalQuality.tier,
          flags: r.retrievalQuality.flags,
          rejectHeuristics: r.retrievalQuality.rejectHeuristics,
          ingestionPriorityBreakdown: r.ingestionPriority.breakdown,
        })),
        full: wave1Ranked,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${calPath}`);
  console.log(`Wrote ${rankedPath}`);
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
