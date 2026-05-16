import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { isPublicMomentCitationRich } from "@/lib/moments/public-moment-citation-rich";
import { evaluatePublicMoment } from "@/lib/quality";
import { classifyExplanationFromText } from "@/lib/research/classify-explanation-role";
import { evaluateSourceAuthorityForPublicMoment } from "@/lib/research/source-authority";

const SHALLOW_AUTHORITY_LABELS = new Set([
  "entertainment_commentary",
  "opinion_heavy",
  "unknown_weak_context",
]);

/** Transcript / packaging patterns that often produce low-signal retrieval text (not exhaustive). */
const TRANSCRIPT_POISON_RES: RegExp[] = [
  /\b(hit subscribe|smash like|ring the bell|join the discord|patreon|sponsor|promo code)\b/i,
  /\b(like and subscribe|subscribe to|check the link below)\b/i,
];

export type MomentCalibrationSignals = {
  videoId: string;
  channelName: string;
  topic: string;
  citationWorthy: boolean;
  /** Passed materialization and not low retrieval tier. */
  accepted: boolean;
  lowTier: boolean;
  authorityLabel: string;
  shallowAuthority: boolean;
  researchWorkflowHint: boolean;
  transcriptPoisonHit: boolean;
  opinionLikelihood: number;
  technicalLikelihood: number;
};

export function estimateTranscriptHoursFromSegments(
  segments: ReadonlyArray<{ start: number; duration?: number }>
): number | null {
  if (!segments.length) return null;
  let endSec = 0;
  let maxStart = 0;
  for (const seg of segments) {
    const s = Number.isFinite(seg.start) ? seg.start : 0;
    const d = Number.isFinite(seg.duration) && seg.duration != null ? Math.max(0, seg.duration) : 0;
    maxStart = Math.max(maxStart, s);
    endSec = Math.max(endSec, s + d);
  }
  const anyPositiveDuration = segments.some((seg) => (seg.duration ?? 0) > 0);
  if (!anyPositiveDuration && maxStart > 0) {
    endSec = maxStart + 30;
  } else if (endSec <= maxStart) {
    endSec = maxStart + 3;
  }
  if (endSec <= 0) return null;
  return endSec / 3600;
}

function channelKey(m: PublicMomentRecord): string {
  const c = m.channelName?.trim();
  return c && c.length > 0 ? c : "unknown_channel";
}

function topicKey(m: PublicMomentRecord): string {
  return (m.topic ?? "uncategorized").trim() || "uncategorized";
}

function momentSignals(m: PublicMomentRecord): MomentCalibrationSignals {
  const citationWorthy = isPublicMomentCitationRich(m);
  const ev = evaluatePublicMoment(m);
  const accepted = ev.qualityTier !== "low";
  const lowTier = ev.qualityTier === "low";
  const authorityLabel = evaluateSourceAuthorityForPublicMoment(m).sourceAuthorityLabel;
  const shallowAuthority = SHALLOW_AUTHORITY_LABELS.has(authorityLabel);
  const cls = classifyExplanationFromText({
    phrase: m.phrase,
    snippet: m.snippet,
    videoTitle: m.videoTitle,
    extractionKinds: m.semantic?.extractionKinds,
  });
  const researchWorkflowHint =
    cls.technicalLikelihood + cls.counterLikelihood + cls.primarySourceLikelihood >= 1;
  const hay = `${m.snippet} ${m.phrase}`;
  const transcriptPoisonHit = TRANSCRIPT_POISON_RES.some((re) => re.test(hay));

  return {
    videoId: m.videoId,
    channelName: channelKey(m),
    topic: topicKey(m),
    citationWorthy,
    accepted,
    lowTier,
    authorityLabel,
    shallowAuthority,
    researchWorkflowHint,
    transcriptPoisonHit,
    opinionLikelihood: cls.opinionLikelihood,
    technicalLikelihood: cls.technicalLikelihood,
  };
}

export type RetrievalCalibrationChannelRow = {
  channelName: string;
  videoCount: number;
  momentCount: number;
  momentsWithKnownTranscriptHours: number;
  knownTranscriptHours: number;
  acceptedMomentCount: number;
  acceptedMomentsWithKnownHours: number;
  citationWorthyMomentCount: number;
  citationWorthyMomentsWithKnownHours: number;
  lowTierMomentCount: number;
  shallowAuthorityMomentCount: number;
  researchWorkflowHintCount: number;
  transcriptPoisonMomentCount: number;
  meanOpinionLikelihood: number;
  meanTechnicalLikelihood: number;
  /** accepted / knownTranscriptHours */
  acceptedPerTranscriptHour: number | null;
  /** citation-worthy / knownTranscriptHours */
  citationWorthyPerTranscriptHour: number | null;
  /** moments / knownTranscriptHours (known-hours slice only) */
  momentsPerTranscriptHour: number | null;
  /** low-tier share among this channel's moments */
  lowTierShare: number;
  /** shallow authority labels / moments */
  shallowAuthorityShare: number;
  /** heuristic density for “would a researcher return?” */
  researchWorkflowShare: number;
  transcriptPoisonShare: number;
};

export type RetrievalCalibrationTopicRow = Omit<
  RetrievalCalibrationChannelRow,
  "channelName"
> & { topic: string };

export type RetrievalCalibrationSummary = {
  generatedAt: string;
  totalMoments: number;
  uniqueVideos: number;
  uniqueChannels: number;
  videosWithTranscriptDuration: number;
  totalKnownTranscriptHours: number;
  /** Product / server aggregates — not available from static JSON alone. */
  repeatResearchBehaviorNote: string;
  globalAcceptedPerHour: number | null;
  globalCitationWorthyPerHour: number | null;
  globalMomentsPerHour: number | null;
  channels: RetrievalCalibrationChannelRow[];
  topics: RetrievalCalibrationTopicRow[];
};

function finalizeRow(params: {
  channelName: string;
  videoCount: number;
  momentCount: number;
  momentsWithKnownTranscriptHours: number;
  knownTranscriptHours: number;
  acceptedMomentCount: number;
  acceptedMomentsWithKnownHours: number;
  citationWorthyMomentCount: number;
  citationWorthyMomentsWithKnownHours: number;
  lowTierMomentCount: number;
  shallowAuthorityMomentCount: number;
  researchWorkflowHintCount: number;
  transcriptPoisonMomentCount: number;
  opinionLikelihoodSum: number;
  technicalLikelihoodSum: number;
}): RetrievalCalibrationChannelRow {
  const {
    channelName,
    videoCount,
    momentCount,
    momentsWithKnownTranscriptHours,
    knownTranscriptHours,
    acceptedMomentCount,
    acceptedMomentsWithKnownHours,
    citationWorthyMomentCount,
    citationWorthyMomentsWithKnownHours,
    lowTierMomentCount,
    shallowAuthorityMomentCount,
    researchWorkflowHintCount,
    transcriptPoisonMomentCount,
    opinionLikelihoodSum,
    technicalLikelihoodSum,
  } = params;

  const h = knownTranscriptHours > 0 ? knownTranscriptHours : null;
  return {
    channelName,
    videoCount,
    momentCount,
    momentsWithKnownTranscriptHours,
    knownTranscriptHours,
    acceptedMomentCount,
    acceptedMomentsWithKnownHours,
    citationWorthyMomentCount,
    citationWorthyMomentsWithKnownHours,
    lowTierMomentCount,
    shallowAuthorityMomentCount,
    researchWorkflowHintCount,
    transcriptPoisonMomentCount,
    meanOpinionLikelihood: momentCount ? opinionLikelihoodSum / momentCount : 0,
    meanTechnicalLikelihood: momentCount ? technicalLikelihoodSum / momentCount : 0,
    acceptedPerTranscriptHour: h != null ? acceptedMomentsWithKnownHours / h : null,
    citationWorthyPerTranscriptHour: h != null ? citationWorthyMomentsWithKnownHours / h : null,
    momentsPerTranscriptHour: h != null ? momentsWithKnownTranscriptHours / h : null,
    lowTierShare: momentCount ? lowTierMomentCount / momentCount : 0,
    shallowAuthorityShare: momentCount ? shallowAuthorityMomentCount / momentCount : 0,
    researchWorkflowShare: momentCount ? researchWorkflowHintCount / momentCount : 0,
    transcriptPoisonShare: momentCount ? transcriptPoisonMomentCount / momentCount : 0,
  };
}

function aggregateRows(
  moments: PublicMomentRecord[],
  transcriptHoursByVideoId: ReadonlyMap<string, number | null>,
  keyFn: (m: PublicMomentRecord) => string
): RetrievalCalibrationChannelRow[] {
  type Acc = {
    videoIds: Set<string>;
    momentCount: number;
    momentsWithKnownTranscriptHours: number;
    acceptedMomentCount: number;
    acceptedMomentsWithKnownHours: number;
    citationWorthyMomentCount: number;
    citationWorthyMomentsWithKnownHours: number;
    lowTierMomentCount: number;
    shallowAuthorityMomentCount: number;
    researchWorkflowHintCount: number;
    transcriptPoisonMomentCount: number;
    opinionLikelihoodSum: number;
    technicalLikelihoodSum: number;
  };

  const map = new Map<string, Acc>();

  for (const m of moments) {
    const k = keyFn(m);
    const sig = momentSignals(m);
    const hours = transcriptHoursByVideoId.get(m.videoId) ?? null;
    const known = hours != null && hours > 0;

    let acc = map.get(k);
    if (!acc) {
      acc = {
        videoIds: new Set(),
        momentCount: 0,
        momentsWithKnownTranscriptHours: 0,
        acceptedMomentCount: 0,
        acceptedMomentsWithKnownHours: 0,
        citationWorthyMomentCount: 0,
        citationWorthyMomentsWithKnownHours: 0,
        lowTierMomentCount: 0,
        shallowAuthorityMomentCount: 0,
        researchWorkflowHintCount: 0,
        transcriptPoisonMomentCount: 0,
        opinionLikelihoodSum: 0,
        technicalLikelihoodSum: 0,
      };
      map.set(k, acc);
    }

    acc.videoIds.add(m.videoId);
    acc.momentCount += 1;
    acc.opinionLikelihoodSum += sig.opinionLikelihood;
    acc.technicalLikelihoodSum += sig.technicalLikelihood;

    if (known) {
      acc.momentsWithKnownTranscriptHours += 1;
    }

    if (sig.accepted) {
      acc.acceptedMomentCount += 1;
      if (known) acc.acceptedMomentsWithKnownHours += 1;
    }
    if (sig.citationWorthy) {
      acc.citationWorthyMomentCount += 1;
      if (known) acc.citationWorthyMomentsWithKnownHours += 1;
    }
    if (sig.lowTier) acc.lowTierMomentCount += 1;
    if (sig.shallowAuthority) acc.shallowAuthorityMomentCount += 1;
    if (sig.researchWorkflowHint) acc.researchWorkflowHintCount += 1;
    if (sig.transcriptPoisonHit) acc.transcriptPoisonMomentCount += 1;
  }

  const rows: RetrievalCalibrationChannelRow[] = [];
  for (const [name, acc] of map) {
    let knownTranscriptHours = 0;
    for (const vid of acc.videoIds) {
      const h = transcriptHoursByVideoId.get(vid);
      if (h != null && h > 0) knownTranscriptHours += h;
    }

    rows.push(
      finalizeRow({
        channelName: name,
        videoCount: acc.videoIds.size,
        momentCount: acc.momentCount,
        momentsWithKnownTranscriptHours: acc.momentsWithKnownTranscriptHours,
        knownTranscriptHours,
        acceptedMomentCount: acc.acceptedMomentCount,
        acceptedMomentsWithKnownHours: acc.acceptedMomentsWithKnownHours,
        citationWorthyMomentCount: acc.citationWorthyMomentCount,
        citationWorthyMomentsWithKnownHours: acc.citationWorthyMomentsWithKnownHours,
        lowTierMomentCount: acc.lowTierMomentCount,
        shallowAuthorityMomentCount: acc.shallowAuthorityMomentCount,
        researchWorkflowHintCount: acc.researchWorkflowHintCount,
        transcriptPoisonMomentCount: acc.transcriptPoisonMomentCount,
        opinionLikelihoodSum: acc.opinionLikelihoodSum,
        technicalLikelihoodSum: acc.technicalLikelihoodSum,
      })
    );
  }

  return rows;
}

export function buildRetrievalCalibrationReport(
  moments: PublicMomentRecord[],
  transcriptHoursByVideoId: ReadonlyMap<string, number | null>
): RetrievalCalibrationSummary {
  const videoIds = [...new Set(moments.map((m) => m.videoId))];
  let videosWithTranscriptDuration = 0;
  let totalKnownTranscriptHours = 0;
  for (const id of videoIds) {
    const h = transcriptHoursByVideoId.get(id);
    if (h != null && h > 0) {
      videosWithTranscriptDuration += 1;
      totalKnownTranscriptHours += h;
    }
  }

  let momentsWithKnown = 0;
  let acceptedWithKnown = 0;
  let citeWithKnown = 0;
  for (const m of moments) {
    const h = transcriptHoursByVideoId.get(m.videoId);
    if (h == null || h <= 0) continue;
    momentsWithKnown += 1;
    const sig = momentSignals(m);
    if (sig.accepted) acceptedWithKnown += 1;
    if (sig.citationWorthy) citeWithKnown += 1;
  }

  const gh = totalKnownTranscriptHours > 0 ? totalKnownTranscriptHours : null;

  const channels = aggregateRows(moments, transcriptHoursByVideoId, channelKey).sort((a, b) => {
    const ca = a.citationWorthyPerTranscriptHour ?? -1;
    const cb = b.citationWorthyPerTranscriptHour ?? -1;
    if (cb !== ca) return cb - ca;
    return b.momentCount - a.momentCount;
  });

  const topics = aggregateRows(moments, transcriptHoursByVideoId, topicKey)
    .map((r) => {
      const { channelName, ...rest } = r;
      return { ...rest, topic: channelName } satisfies RetrievalCalibrationTopicRow;
    })
    .sort((a, b) => b.momentCount - a.momentCount);

  return {
    generatedAt: new Date().toISOString(),
    totalMoments: moments.length,
    uniqueVideos: videoIds.length,
    uniqueChannels: channels.length,
    videosWithTranscriptDuration,
    totalKnownTranscriptHours,
    repeatResearchBehaviorNote:
      "Repeat saves, compare flows, and reformulated searches require server-side analytics aggregates (e.g. saved_clip, compare_explanation_*, research_*). This report uses corpus-local heuristics only until those are joined in a later pipeline step.",
    globalAcceptedPerHour: gh != null ? acceptedWithKnown / gh : null,
    globalCitationWorthyPerHour: gh != null ? citeWithKnown / gh : null,
    globalMomentsPerHour: gh != null ? momentsWithKnown / gh : null,
    channels,
    topics: topics.slice(0, 40),
  };
}

export function formatRetrievalCalibrationMarkdown(summary: RetrievalCalibrationSummary): string {
  const lines: string[] = [];
  lines.push("# Retrieval-quality calibration report");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push("");
  lines.push("## Framing");
  lines.push("");
  lines.push(
    "This report **does not** optimize ingest throughput. It measures **research yield density**: accepted and citation-worthy moments normalized by **indexed transcript hours** where duration could be resolved from the transcript cache."
  );
  lines.push("");
  lines.push("**North star:** would a serious user return to research this topic again — not whether we can surface another clip.");
  lines.push("");
  lines.push("## Global density (moments tied to known transcript hours)");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Total moments | ${summary.totalMoments} |`);
  lines.push(`| Unique videos | ${summary.uniqueVideos} |`);
  lines.push(`| Videos with resolved transcript duration | ${summary.videosWithTranscriptDuration} |`);
  lines.push(`| Sum of known transcript hours (videos counted once each) | ${summary.totalKnownTranscriptHours.toFixed(3)} |`);
  lines.push(
    `| Accepted moments / transcript hour (global) | ${summary.globalAcceptedPerHour == null ? "—" : summary.globalAcceptedPerHour.toFixed(2)} |`
  );
  lines.push(
    `| Citation-worthy moments / transcript hour (global) | ${summary.globalCitationWorthyPerHour == null ? "—" : summary.globalCitationWorthyPerHour.toFixed(2)} |`
  );
  lines.push(
    `| Moments / transcript hour (known-hours slice) | ${summary.globalMomentsPerHour == null ? "—" : summary.globalMomentsPerHour.toFixed(2)} |`
  );
  lines.push("");
  lines.push("## Repeat research behavior");
  lines.push("");
  lines.push(summary.repeatResearchBehaviorNote);
  lines.push("");
  lines.push(
    "**Heuristic proxy in tables:** `research_workflow_share` = share of moments with technical / counterpoint / primary-source phrasing (see `classifyExplanationFromText`). It is not a substitute for product analytics."
  );
  lines.push("");
  lines.push("## By channel (source)");
  lines.push("");
  lines.push(
    "Sorted by **citation-worthy / transcript hour** (desc). Channels with no resolved transcript hours show **—** for hour-normalized columns; raw counts still indicate clutter vs. cite density."
  );
  lines.push("");
  lines.push(
    "| Channel | Videos | Moments | Known h | accepted/h | cite-worthy/h | moments/h | low-tier % | shallow auth % | research workflow % | poison-pattern % |"
  );
  lines.push(
    "|---------|-------:|--------:|--------:|-----------:|---------------:|------------:|-----------:|-----------------:|----------------------:|------------------:|"
  );
  for (const c of summary.channels) {
    const aph = c.acceptedPerTranscriptHour == null ? "—" : c.acceptedPerTranscriptHour.toFixed(2);
    const cph = c.citationWorthyPerTranscriptHour == null ? "—" : c.citationWorthyPerTranscriptHour.toFixed(2);
    const mph = c.momentsPerTranscriptHour == null ? "—" : c.momentsPerTranscriptHour.toFixed(2);
    lines.push(
      `| ${c.channelName} | ${c.videoCount} | ${c.momentCount} | ${c.knownTranscriptHours.toFixed(3)} | ${aph} | ${cph} | ${mph} | ${(c.lowTierShare * 100).toFixed(1)}% | ${(c.shallowAuthorityShare * 100).toFixed(1)}% | ${(c.researchWorkflowShare * 100).toFixed(1)}% | ${(c.transcriptPoisonShare * 100).toFixed(1)}% |`
    );
  }
  lines.push("");
  lines.push("## By topic (top 40 by moment count)");
  lines.push("");
  lines.push(
    "| Topic | Videos | Moments | Known h | accepted/h | cite-worthy/h | low-tier % | research workflow % |"
  );
  lines.push("|-------|-------:|--------:|--------:|-----------:|---------------:|-----------:|----------------------:|");
  for (const t of summary.topics) {
    const aph = t.acceptedPerTranscriptHour == null ? "—" : t.acceptedPerTranscriptHour.toFixed(2);
    const cph = t.citationWorthyPerTranscriptHour == null ? "—" : t.citationWorthyPerTranscriptHour.toFixed(2);
    lines.push(
      `| ${t.topic} | ${t.videoCount} | ${t.momentCount} | ${t.knownTranscriptHours.toFixed(3)} | ${aph} | ${cph} | ${(t.lowTierShare * 100).toFixed(1)}% | ${(t.researchWorkflowShare * 100).toFixed(1)}% |`
    );
  }
  lines.push("");
  lines.push("## How to read “noise” vs “reusable knowledge”");
  lines.push("");
  lines.push(
    "- **Reusable knowledge:** higher **cite-worthy/h** and **accepted/h** with lower **low-tier %**."
  );
  lines.push(
    "- **Semantic clutter:** high **moments/h** with low **cite-worthy/h**, or high **shallow auth %** + high **low-tier %**."
  );
  lines.push(
    "- **Transcript poison:** marketing / CTA phrases in the moment text (`poison-pattern %`) — often harmless in isolation but noisy at scale."
  );
  lines.push("");
  lines.push(
    "**Hard rule (calibration):** if a source grows moment count faster than it grows citation-worthy and accepted density per transcript hour, treat it as a **net negative** for retrieval until rescored or deprioritized."
  );
  lines.push("");
  return lines.join("\n");
}
