import type { RetrievalQualityDimensionId, RetrievalQualityResult } from "./retrieval-quality";
import type { IngestionPriorityWeights } from "./retrieval-priority-weights";
import type { ResearchValueMetrics } from "./research-value-metrics";

export type VideoEvalSlice = {
  videoId: string;
  channelName: string;
  segmentCount: number;
  momentCount: number;
  transcriptHours: number | null;
  retrieval: RetrievalQualityResult;
  research: ResearchValueMetrics;
};

export function citationsPerHour(v: VideoEvalSlice): number | null {
  return v.research.citationsPerTranscriptHour;
}

export function acceptedPerHour(v: VideoEvalSlice): number | null {
  return v.research.acceptedMomentsPerTranscriptHour;
}

export type DimensionPredictivenessRow = {
  dimensionId: RetrievalQualityDimensionId;
  label: string;
  pearsonVsCitationsPerHour: number | null;
  pearsonVsAcceptedPerHour: number | null;
  meanNormalized: number;
  sampleSize: number;
};

export type ChannelResearchDensityRow = {
  channelName: string;
  videoCount: number;
  momentCount: number;
  meanCitationsPerHour: number | null;
  meanRetrievalOverall: number;
  /** Corpus footprint proxy (not YouTube popularity). */
  corpusFootprint: number;
  researchDensityScore: number;
};

export type Wave1BatchComparison = {
  batchSize: number;
  preCalibration: {
    videoIds: string[];
    expectedCitationsPerHour: number | null;
    expectedAcceptedPerHour: number | null;
    meanPriorityScore: number;
  };
  tuned: {
    videoIds: string[];
    expectedCitationsPerHour: number | null;
    expectedAcceptedPerHour: number | null;
    meanPriorityScore: number;
  };
  deltaCitationsPerHour: number | null;
  deltaAcceptedPerHour: number | null;
  retrievalTrustImproved: boolean;
};

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return null;
  return num / den;
}

function dimNorm(r: RetrievalQualityResult, id: RetrievalQualityDimensionId): number {
  return r.dimensions.find((d) => d.id === id)?.normalized ?? 0;
}

export function analyzeDimensionPredictiveness(videos: VideoEvalSlice[]): DimensionPredictivenessRow[] {
  const withHours = videos.filter(
    (v) => v.transcriptHours != null && v.transcriptHours > 0 && citationsPerHour(v) != null
  );
  const citeY = withHours.map((v) => citationsPerHour(v)!);
  const accY = withHours
    .filter((v) => acceptedPerHour(v) != null)
    .map((v) => acceptedPerHour(v)!);

  const dimIds = (withHours[0]?.retrieval.dimensions.map((d) => d.id) ?? []) as RetrievalQualityDimensionId[];

  return dimIds.map((dimensionId) => {
    const label = withHours[0]?.retrieval.dimensions.find((d) => d.id === dimensionId)?.label ?? dimensionId;
    const xs = withHours.map((v) => dimNorm(v.retrieval, dimensionId));
    const accRows = withHours.filter((v) => acceptedPerHour(v) != null);
    const xsAcc = accRows.map((v) => dimNorm(v.retrieval, dimensionId));
    const meanNormalized = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    return {
      dimensionId,
      label,
      pearsonVsCitationsPerHour: pearson(xs, citeY),
      pearsonVsAcceptedPerHour: accRows.length >= 3 ? pearson(xsAcc, accY) : null,
      meanNormalized,
      sampleSize: xs.length,
    };
  });
}

export function analyzeConversationalDriftHeuristic(videos: VideoEvalSlice[]) {
  const driftMatched = videos.filter((v) =>
    v.retrieval.rejectHeuristics.find((h) => h.id === "low_information_conversational_drift" && h.matched)
  );
  let tutorialSpared = 0;
  for (const v of driftMatched) {
    const action = dimNorm(v.retrieval, "actionable_tutorial_density");
    if (action >= 0.45) tutorialSpared += 1;
  }
  return {
    matchedVideoCount: driftMatched.length,
    wouldBeTutorialFalsePositive: tutorialSpared,
    matchedChannels: [...new Set(driftMatched.map((v) => v.channelName))].slice(0, 12),
  };
}

export function analyzeChannelResearchDensity(videos: VideoEvalSlice[]): {
  highDensityLowFootprint: ChannelResearchDensityRow[];
  largeFootprintWeakRetrieval: ChannelResearchDensityRow[];
  all: ChannelResearchDensityRow[];
} {
  const by = new Map<string, VideoEvalSlice[]>();
  for (const v of videos) {
    const list = by.get(v.channelName) ?? [];
    list.push(v);
    by.set(v.channelName, list);
  }

  const all: ChannelResearchDensityRow[] = [];
  for (const [channelName, rows] of by) {
    const citeHours = rows.map((r) => citationsPerHour(r)).filter((x): x is number => x != null);
    const meanCitationsPerHour =
      citeHours.length > 0 ? citeHours.reduce((a, b) => a + b, 0) / citeHours.length : null;
    const meanRetrievalOverall =
      rows.reduce((s, r) => s + r.retrieval.overallNormalized, 0) / rows.length;
    const momentCount = rows.reduce((s, r) => s + r.momentCount, 0);
    const corpusFootprint = momentCount + rows.length * 2;
    const researchDensityScore =
      (meanCitationsPerHour ?? 0) * 0.55 + meanRetrievalOverall * 0.45;
    all.push({
      channelName,
      videoCount: rows.length,
      momentCount,
      meanCitationsPerHour,
      meanRetrievalOverall,
      corpusFootprint,
      researchDensityScore,
    });
  }

  const highDensityLowFootprint = [...all]
    .filter((c) => (c.meanCitationsPerHour ?? 0) >= 0.45 && c.corpusFootprint <= 25)
    .sort((a, b) => b.researchDensityScore - a.researchDensityScore)
    .slice(0, 12);

  const largeFootprintWeakRetrieval = [...all]
    .filter((c) => c.corpusFootprint >= 12 && c.meanRetrievalOverall < 0.48)
    .sort((a, b) => b.corpusFootprint - a.corpusFootprint)
    .slice(0, 12);

  return { highDensityLowFootprint, largeFootprintWeakRetrieval, all };
}

export type ExpertVsConversationalComparison = {
  expertChannels: ChannelResearchDensityRow[];
  conversationalChannels: ChannelResearchDensityRow[];
  expertMeanCitationsPerHour: number | null;
  conversationalMeanCitationsPerHour: number | null;
  expertMeanResearchDensityScore: number;
  conversationalMeanResearchDensityScore: number;
};

/** Small expert channels vs large conversational podcast-shaped sources (corpus footprint, not YouTube popularity). */
export function analyzeExpertVsConversational(
  channels: ChannelResearchDensityRow[]
): ExpertVsConversationalComparison {
  const CONVERSATIONAL_RE =
    /\b(podcast|fridman|dwarkesh|rogan|interview|conversation|diary of a ceo)\b/i;

  const expertChannels = channels.filter(
    (c) =>
      c.corpusFootprint <= 22 &&
      (c.meanCitationsPerHour ?? 0) >= 0.45 &&
      !CONVERSATIONAL_RE.test(c.channelName)
  );
  const conversationalChannels = channels.filter(
    (c) =>
      CONVERSATIONAL_RE.test(c.channelName) ||
      (c.corpusFootprint >= 18 && (c.meanCitationsPerHour ?? 1) < 0.62)
  );

  function meanCite(rows: ChannelResearchDensityRow[]) {
    const vals = rows.map((r) => r.meanCitationsPerHour).filter((x): x is number => x != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  function meanDensity(rows: ChannelResearchDensityRow[]) {
    return rows.length ? rows.reduce((s, r) => s + r.researchDensityScore, 0) / rows.length : 0;
  }

  return {
    expertChannels: expertChannels.sort((a, b) => b.researchDensityScore - a.researchDensityScore),
    conversationalChannels: conversationalChannels.sort(
      (a, b) => b.corpusFootprint - a.corpusFootprint
    ),
    expertMeanCitationsPerHour: meanCite(expertChannels),
    conversationalMeanCitationsPerHour: meanCite(conversationalChannels),
    expertMeanResearchDensityScore: meanDensity(expertChannels),
    conversationalMeanResearchDensityScore: meanDensity(conversationalChannels),
  };
}

export type Wave1SimulationComparison = {
  batchSize: number;
  preCalibration: Wave1BatchComparison["preCalibration"] & { label: string };
  tunedV1: Wave1BatchComparison["tuned"] & { label: string };
  tunedV2: Wave1BatchComparison["tuned"] & { label: string };
  deltaV1VsPreCitationsPerHour: number | null;
  deltaV2VsPreCitationsPerHour: number | null;
  deltaV2VsV1CitationsPerHour: number | null;
  retrievalTrustImprovedV1: boolean;
  retrievalTrustImprovedV2: boolean;
  readyForControlledIngest: boolean;
};

export function compareWave1BatchTrust(params: {
  candidates: { videoId: string; priorityScore: number }[];
  videoById: Map<string, VideoEvalSlice>;
  batchSize: number;
  preScores: Map<string, number>;
  tunedScores: Map<string, number>;
}): Wave1BatchComparison {
  const { candidates, videoById, batchSize, preScores, tunedScores } = params;

  const preSorted = [...candidates].sort(
    (a, b) => (preScores.get(b.videoId) ?? 0) - (preScores.get(a.videoId) ?? 0)
  );
  const tunedSorted = [...candidates].sort(
    (a, b) => (tunedScores.get(b.videoId) ?? 0) - (tunedScores.get(a.videoId) ?? 0)
  );

  function batchMetrics(ids: string[]) {
    const slices = ids.map((id) => videoById.get(id)).filter(Boolean) as VideoEvalSlice[];
    const cite = slices.map((s) => citationsPerHour(s)).filter((x): x is number => x != null);
    const acc = slices.map((s) => acceptedPerHour(s)).filter((x): x is number => x != null);
    return {
      videoIds: ids,
      expectedCitationsPerHour: cite.length ? cite.reduce((a, b) => a + b, 0) / cite.length : null,
      expectedAcceptedPerHour: acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null,
      meanPriorityScore: 0,
    };
  }

  const preBatch = batchMetrics(preSorted.slice(0, batchSize).map((c) => c.videoId));
  const tunedBatch = batchMetrics(tunedSorted.slice(0, batchSize).map((c) => c.videoId));
  preBatch.meanPriorityScore =
    preSorted.slice(0, batchSize).reduce((s, c) => s + (preScores.get(c.videoId) ?? 0), 0) / batchSize;
  tunedBatch.meanPriorityScore =
    tunedSorted.slice(0, batchSize).reduce((s, c) => s + (tunedScores.get(c.videoId) ?? 0), 0) / batchSize;

  const deltaCitationsPerHour =
    preBatch.expectedCitationsPerHour != null && tunedBatch.expectedCitationsPerHour != null
      ? tunedBatch.expectedCitationsPerHour - preBatch.expectedCitationsPerHour
      : null;
  const deltaAcceptedPerHour =
    preBatch.expectedAcceptedPerHour != null && tunedBatch.expectedAcceptedPerHour != null
      ? tunedBatch.expectedAcceptedPerHour - preBatch.expectedAcceptedPerHour
      : null;

  const retrievalTrustImproved =
    (deltaCitationsPerHour != null && deltaCitationsPerHour > 0.02) ||
    (deltaAcceptedPerHour != null && deltaAcceptedPerHour > 0.05);

  return {
    batchSize,
    preCalibration: preBatch,
    tuned: tunedBatch,
    deltaCitationsPerHour,
    deltaAcceptedPerHour,
    retrievalTrustImproved,
  };
}

const EMPIRICAL_BOOST_DIMS = new Set<RetrievalQualityDimensionId>([
  "semantic_moment_yield",
  "clip_extraction_quality",
  "average_accepted_moment_score",
]);

/** Derive retrieval dimension weights from empirical correlations (governance pass). */
export function deriveDimensionWeightsFromPredictiveness(
  rows: DimensionPredictivenessRow[],
  floor = 0.03
): Partial<Record<RetrievalQualityDimensionId, number>> {
  const raw: Partial<Record<RetrievalQualityDimensionId, number>> = {};
  for (const r of rows) {
    const rCite = r.pearsonVsCitationsPerHour ?? 0;
    const rAcc = r.pearsonVsAcceptedPerHour ?? 0;
    let score = Math.max(0, rCite) * 0.65 + Math.max(0, rAcc) * 0.35;
    if (EMPIRICAL_BOOST_DIMS.has(r.dimensionId)) {
      score *= 1.75;
    }
    if (r.dimensionId === "citation_richness") {
      score *= 0.55;
    }
    raw[r.dimensionId] = Math.max(floor, score);
  }
  let sum = 0;
  for (const v of Object.values(raw)) sum += v ?? 0;
  if (sum <= 0) return raw;
  for (const k of Object.keys(raw) as RetrievalQualityDimensionId[]) {
    raw[k] = (raw[k] ?? 0) / sum;
  }
  return raw;
}

export function formatValidationMarkdown(payload: {
  generatedAt: string;
  predictiveness: DimensionPredictivenessRow[];
  drift: ReturnType<typeof analyzeConversationalDriftHeuristic>;
  channels: ReturnType<typeof analyzeChannelResearchDensity>;
  expertVsConversational: ExpertVsConversationalComparison;
  wave1Simulation: Wave1SimulationComparison;
  tunedWeightsProfile: IngestionPriorityWeights;
}): string {
  const lines: string[] = [];
  lines.push("# Retrieval weight tuning — validation report");
  lines.push("");
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push("");
  lines.push("## North star");
  lines.push("");
  lines.push("**Did retrieval trust improve?** — not “did the corpus grow?”");
  lines.push("");
  lines.push("## Which dimensions predict cite-worthy output?");
  lines.push("");
  lines.push("| Dimension | r (citations/h) | r (accepted/h) | mean norm |");
  lines.push("|-----------|----------------:|---------------:|----------:|");
  const sorted = [...payload.predictiveness].sort(
    (a, b) => (b.pearsonVsCitationsPerHour ?? -1) - (a.pearsonVsCitationsPerHour ?? -1)
  );
  for (const r of sorted) {
    lines.push(
      `| ${r.label} | ${r.pearsonVsCitationsPerHour == null ? "—" : r.pearsonVsCitationsPerHour.toFixed(3)} | ${r.pearsonVsAcceptedPerHour == null ? "—" : r.pearsonVsAcceptedPerHour.toFixed(3)} | ${r.meanNormalized.toFixed(3)} |`
    );
  }
  lines.push("");
  lines.push("## Conversational drift heuristic (tutorial false positives)");
  lines.push("");
  lines.push(`- Matched videos: ${payload.drift.matchedVideoCount}`);
  lines.push(`- Would spare tutorial-shaped (action density ≥ 0.45): ${payload.drift.wouldBeTutorialFalsePositive}`);
  if (payload.drift.matchedChannels.length) {
    lines.push(`- Sample channels: ${payload.drift.matchedChannels.join(", ")}`);
  }
  lines.push("");
  lines.push("## High research density, low corpus footprint (not popularity)");
  lines.push("");
  for (const c of payload.channels.highDensityLowFootprint) {
    lines.push(
      `- **${c.channelName}** — cite/h ${c.meanCitationsPerHour?.toFixed(2) ?? "—"}, retrieval ${c.meanRetrievalOverall.toFixed(3)}, footprint ${c.corpusFootprint}`
    );
  }
  lines.push("");
  lines.push("## Large footprint, weak retrieval value");
  lines.push("");
  for (const c of payload.channels.largeFootprintWeakRetrieval) {
    lines.push(
      `- **${c.channelName}** — moments ${c.momentCount}, retrieval ${c.meanRetrievalOverall.toFixed(3)}, cite/h ${c.meanCitationsPerHour?.toFixed(2) ?? "—"}`
    );
  }
  lines.push("");
  lines.push("## Small expert channels vs large conversational sources");
  lines.push("");
  lines.push(
    `| Archetype | Mean cite/h | Mean research density | Channels (sample) |`
  );
  lines.push(`|-----------|------------:|----------------------:|-------------------|`);
  lines.push(
    `| Expert / technical (low footprint) | ${payload.expertVsConversational.expertMeanCitationsPerHour?.toFixed(3) ?? "—"} | ${payload.expertVsConversational.expertMeanResearchDensityScore.toFixed(3)} | ${payload.expertVsConversational.expertChannels.slice(0, 6).map((c) => c.channelName).join(", ") || "—"} |`
  );
  lines.push(
    `| Large conversational / podcast-shaped | ${payload.expertVsConversational.conversationalMeanCitationsPerHour?.toFixed(3) ?? "—"} | ${payload.expertVsConversational.conversationalMeanResearchDensityScore.toFixed(3)} | ${payload.expertVsConversational.conversationalChannels.slice(0, 6).map((c) => c.channelName).join(", ") || "—"} |`
  );
  lines.push("");
  lines.push(
    "Research-value ranking should follow **density per transcript hour**, not audience size or moment count alone."
  );
  lines.push("");
  const sim = payload.wave1Simulation;
  lines.push(`## Wave 1 capped simulation (top-${sim.batchSize}, no ingest)`);
  lines.push("");
  lines.push("| Profile | Expected cite/h | Expected accepted/h | Trust improved vs pre? |");
  lines.push("|---------|----------------:|--------------------:|------------------------|");
  lines.push(
    `| Pre-calibration | ${sim.preCalibration.expectedCitationsPerHour?.toFixed(3) ?? "—"} | ${sim.preCalibration.expectedAcceptedPerHour?.toFixed(3) ?? "—"} | baseline |`
  );
  lines.push(
    `| Tuned v1 | ${sim.tunedV1.expectedCitationsPerHour?.toFixed(3) ?? "—"} | ${sim.tunedV1.expectedAcceptedPerHour?.toFixed(3) ?? "—"} | **${sim.retrievalTrustImprovedV1 ? "yes" : "no"}** |`
  );
  lines.push(
    `| Tuned v2 (semantic + clip emphasis) | ${sim.tunedV2.expectedCitationsPerHour?.toFixed(3) ?? "—"} | ${sim.tunedV2.expectedAcceptedPerHour?.toFixed(3) ?? "—"} | **${sim.retrievalTrustImprovedV2 ? "yes" : "no"}** |`
  );
  lines.push("");
  lines.push(
    `| Δ cite/h v1 vs pre | ${sim.deltaV1VsPreCitationsPerHour == null ? "—" : sim.deltaV1VsPreCitationsPerHour.toFixed(3)} |`
  );
  lines.push(
    `| Δ cite/h v2 vs pre | ${sim.deltaV2VsPreCitationsPerHour == null ? "—" : sim.deltaV2VsPreCitationsPerHour.toFixed(3)} |`
  );
  lines.push(
    `| Δ cite/h v2 vs v1 | ${sim.deltaV2VsV1CitationsPerHour == null ? "—" : sim.deltaV2VsV1CitationsPerHour.toFixed(3)} |`
  );
  lines.push("");
  lines.push(
    `**Ready for controlled ingest?** ${sim.readyForControlledIngest ? "Only if v2 trust gate passes — verify manually." : "**No** — weight tuning has not reliably improved cite-worthy output per hour yet."}`
  );
  lines.push("");
  lines.push("### v2 batch video ids (simulation only)");
  lines.push("");
  lines.push(sim.tunedV2.videoIds.join(", "));
  lines.push("");
  lines.push("## Tuned ingestion priority profile (summary)");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(payload.tunedWeightsProfile, null, 2));
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
