#!/usr/bin/env tsx
/**
 * Writes data/public-moments.json — quality-filtered canonical /moment/[id]/[slug] rows.
 * Semantic extraction + ranking enrich multi-word moments; existing rows can be preserved
 * so stable ids/slugs keep working (PUBLIC_MOMENTS_PRESERVE_EXISTING, default on).
 *
 *   npm run materialize:public-moments
 *   PUBLIC_MOMENTS_CAP=140 PUBLIC_MOMENTS_PER_VIDEO=12 npm run materialize:public-moments
 *   PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP=64  # extra rows beyond preserved (default 56) when preserve is on
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getIndexedVideoById } from "@/lib/indexed-videos";
import { evaluateMomentMaterialization } from "@/lib/moments/public-moment-quality";
import type { PublicMomentRecord, PublicMomentSemanticLayer } from "@/lib/moments/public-moment-types";
import { areNearDuplicateMoments, clusterNearDuplicatePhrases } from "@/lib/moments/semantic-moment-dedupe";
import { buildSemanticMomentCitations } from "@/lib/moments/semantic-moment-citations";
import { scoreSemanticMomentRanking } from "@/lib/moments/semantic-moment-ranking";
import { labelSemanticMomentTopics } from "@/lib/moments/semantic-moment-topics";
import { extractSemanticPhrasesFromTranscript, type SemanticExtractionKind } from "@/lib/moments/semantic-extractor";
import { rejectWeakSemanticPhrase } from "@/lib/moments/semantic-phrase-gates";
import { computePublicMomentStableId } from "@/lib/moments/stable-id";
import { momentQualityRankingKey } from "@/lib/quality";
import { hybridFindMatches } from "@/lib/search/per-video-hybrid-search";
import { getSiteUrl, slugifyQuery } from "@/lib/seo";
import { suggestKeywords } from "@/lib/transcript-search";
import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";
import type { TranscriptLine } from "@/lib/transcript-types";

const CAP = Math.min(200, Math.max(50, Number(process.env.PUBLIC_MOMENTS_CAP ?? 120)));
const KEYWORD_POOL = Number(process.env.PUBLIC_MOMENTS_KEYWORD_POOL ?? 64);
const MAX_PER_VIDEO = Number(process.env.PUBLIC_MOMENTS_PER_VIDEO ?? 10);
const SEMANTIC_POOL = Math.min(260, Math.max(40, Number(process.env.PUBLIC_MOMENTS_SEMANTIC_POOL ?? 140)));
const SEMANTIC_ADDITIVE_CAP = Math.min(
  120,
  Math.max(0, Number(process.env.PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP ?? 56))
);
const PRESERVE_TOTAL_MAX = Math.min(280, Math.max(CAP, Number(process.env.PUBLIC_MOMENTS_MAX_TOTAL ?? 220)));
const PRESERVE_EXISTING = process.env.PUBLIC_MOMENTS_PRESERVE_EXISTING !== "0";

type Candidate = PublicMomentRecord & {
  qualityScore: number;
  fromSemantic: boolean;
  extractionKinds: SemanticExtractionKind[];
};

type RejectLog = { videoId: string; phrase: string; reason: string; totalScore?: number };
type AcceptLog = { videoId: string; phrase: string; totalScore: number; fromSemantic?: boolean };

function toTranscriptLines(
  segments: Array<{ text: string; start: number; duration?: number }>
): TranscriptLine[] {
  return segments.map((segment) => ({
    text: segment.text,
    start: segment.start,
    duration: segment.duration ?? 0,
  }));
}

function disambiguateSlug(base: string, used: Set<string>) {
  let slug = base;
  let n = 0;
  while (used.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  used.add(slug);
  return slug;
}

function loadPreservedMoments(): PublicMomentRecord[] {
  if (!PRESERVE_EXISTING) return [];
  try {
    const raw = readFileSync(join(process.cwd(), "data/public-moments.json"), "utf-8");
    const parsed = JSON.parse(raw) as { moments?: PublicMomentRecord[] } | PublicMomentRecord[];
    const rows = Array.isArray(parsed) ? parsed : parsed.moments;
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => row && typeof row.id === "string" && typeof row.canonicalSlug === "string");
  } catch {
    return [];
  }
}

function buildPhraseFrequency(lines: TranscriptLine[], videoId: string) {
  const counts = new Map<string, number>();
  const bump = (p: string) => {
    const k = `${videoId}|${p.toLowerCase()}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  const text = lines.map((l) => l.text).join(" ");
  for (const m of text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []) bump(m);
  return (phrase: string) => counts.get(`${videoId}|${phrase.toLowerCase()}`) ?? 1;
}

function dedupeGreedyNearDuplicates(sorted: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  for (const c of sorted) {
    if (out.some((e) => areNearDuplicateMoments(e, c))) continue;
    out.push(c);
  }
  return out;
}

function buildSemanticLayer(
  row: Omit<PublicMomentRecord, "semantic" | "qualityScore">,
  extractionKinds: SemanticExtractionKind[],
  snippet: string,
  indexed: Awaited<ReturnType<typeof getIndexedVideoById>>,
  phraseCorpusFrequency: number,
  segmentCount: number
): PublicMomentSemanticLayer {
  const topics = labelSemanticMomentTopics({
    phrase: row.phrase,
    snippet,
    extractionKinds,
    indexed,
  });
  const rank = scoreSemanticMomentRanking({
    phrase: row.phrase,
    snippet,
    extractionKinds,
    phraseCorpusFrequency,
    segmentCount,
    channelName: row.channelName,
  });
  const siteUrl = getSiteUrl();
  const citations = buildSemanticMomentCitations({
    siteUrl,
    momentId: row.id,
    canonicalSlug: row.canonicalSlug,
    videoId: row.videoId,
    startSeconds: row.startSeconds,
    phrase: row.phrase,
    snippet,
    youtubeUrl: row.youtubeUrl,
    videoTitle: row.videoTitle,
    channelName: row.channelName,
  });
  return {
    extractionKinds,
    rankingSignals: rank.signals,
    totalSemanticRank: rank.total,
    topics,
    citations,
  };
}

function buildMarkdownReport(params: {
  accepted: AcceptLog[];
  rejectedSample: RejectLog[];
  moments: PublicMomentRecord[];
  minStrict: number;
  minSoft: number;
  cap: number;
  preservedCount: number;
  semanticShare: number;
}) {
  const site = getSiteUrl();
  const sampleUrls = params.moments.slice(0, 5).map((m) => `${site}/moment/${m.id}/${m.canonicalSlug}`);

  const acceptRows = [...params.accepted]
    .sort((a, b) => Number(!!b.fromSemantic) - Number(!!a.fromSemantic))
    .slice(0, 18)
    .map((a) => `| ${a.phrase} | ${a.videoId} | ${a.totalScore} | ${a.fromSemantic ? "semantic" : "keyword"} |`)
    .join("\n");

  const rejectRows = params.rejectedSample
    .slice(0, 22)
    .map((r) => `| ${r.phrase} | ${r.videoId} | ${r.reason} | ${r.totalScore ?? "—"} |`)
    .join("\n");

  return `# Public moment quality & materialization

Generated by \`npm run materialize:public-moments\` (do not hand-edit counts; re-run the script).

## Semantic pipeline

- **Extractor**: \`lib/moments/semantic-extractor.ts\` (questions, definitions, comparisons, predictions, frameworks, multi-word concepts).
- **Ranking**: \`lib/moments/semantic-moment-ranking.ts\` (density, snippet completeness, explanatory signals, specificity, uniqueness, creator authority, coherence, engagement prior, search intent).
- **Topics / citations**: \`lib/moments/semantic-moment-topics.ts\`, \`lib/moments/semantic-moment-citations.ts\` (optional \`semantic\` JSON field; canonical URLs unchanged).
- **Preservation**: \`PUBLIC_MOMENTS_PRESERVE_EXISTING=0\` disables merging existing \`data/public-moments.json\` rows (default: **preserve**). When preserving, new semantic rows are appended up to \`PUBLIC_MOMENTS_SEMANTIC_ADDITIVE_CAP\` (default **56**) capped by \`PUBLIC_MOMENTS_MAX_TOTAL\` (default **220**) so legacy URLs stay live while the pool gains multi-word moments.

## Quality rules (code)

- Reject ultra-generic **single-word** stems and **GENERIC_MOMENT_TOKENS** (\`lib/moments/public-moment-quality.ts\`) plus **semantic gates** (\`lib/moments/semantic-phrase-gates.ts\`).
- Keyword fallback **single tokens** require the **strict** gate (soft pass alone is not enough).
- Require **snippet length** ≥ 88 chars and phrase reflection in snippet (\`evaluateMomentMaterialization\`).
- **Strict** default: combined score ≥ **${params.minStrict}**; **soft** ≥ **${params.minSoft}** when fewer than 50 moments would be produced.

## Acceptance summary

| Metric | Value |
|--------|------:|
| Final moment count | **${params.moments.length}** |
| Target cap | **${params.cap}** |
| Preserved rows (URLs) | **${params.preservedCount}** |
| Semantic-origin accepted (sample log) | **${params.semanticShare}** |
| Accepted (logged) | **${params.accepted.length}** |

### Accepted examples (sample)

| Phrase | videoId | score | source |
|--------|---------|------:|--------|
${acceptRows}

### Rejected examples (sample)

| Phrase | videoId | reason | score |
|--------|---------|--------|------|
${rejectRows}

## Sample canonical URLs (production host from \`getSiteUrl()\` at generation time)

${sampleUrls.map((u) => `- ${u}`).join("\n")}

## Evaluation artifacts

- \`data/public-moments-semantic-evaluation.json\` — semantic quality, rejections, topic coverage, duplicate clusters.

## OG / sharing

Moment OG routes use \`lib/og-moment-share-image.tsx\` with try/catch fallback PNG.

## Remaining risks

- **Transcript drift**: hybrid match position can move slightly after re-ingest; stable id still matches tuple (\`videoId|start|phrase\`).
- Tune thresholds via env and \`evaluateMomentMaterialization\` if the pool is too small or noisy.

`;
}

async function main() {
  const preserved = loadPreservedMoments();
  const usedSlugs = new Set<string>(preserved.map((m) => m.canonicalSlug));
  const preservedIds = new Set(preserved.map((m) => m.id));

  const summaries = await listCachedTranscripts();
  const rejected: RejectLog[] = [];
  const pool: Candidate[] = [];

  const minStrict = 20;
  const minSoft = 12;

  for (const summary of summaries) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached || cached.segments.length === 0) continue;

    const lines = toTranscriptLines(cached.segments);
    const indexed = await getIndexedVideoById(summary.videoId);
    const category = indexed?.category ?? cached.category ?? undefined;
    const topic = indexed?.topic ?? undefined;
    const freqForPhrase = buildPhraseFrequency(lines, summary.videoId);

    const semanticList = extractSemanticPhrasesFromTranscript(lines, { maxCandidates: SEMANTIC_POOL });
    const keywords = suggestKeywords(lines, "", KEYWORD_POOL);
    const semanticPhrases = new Set(semanticList.map((s) => s.phrase.toLowerCase()));

    type PhraseJob = { text: string; kinds: SemanticExtractionKind[]; fromSemantic: boolean };
    const jobs: PhraseJob[] = [
      ...semanticList.map((s) => ({ text: s.phrase, kinds: s.kinds, fromSemantic: true })),
      ...keywords.map((k) => ({
        text: k.trim(),
        kinds: [] as SemanticExtractionKind[],
        fromSemantic: false,
      })),
    ];

    for (const job of jobs) {
      const trimmed = job.text.trim();
      if (!trimmed) continue;
      if (!job.fromSemantic && semanticPhrases.has(trimmed.toLowerCase())) continue;

      if (job.fromSemantic) {
        const weak = rejectWeakSemanticPhrase(trimmed);
        if (!weak.ok) {
          rejected.push({ videoId: summary.videoId, phrase: trimmed, reason: `semantic_weak:${weak.reason}` });
          continue;
        }
      }

      const results = hybridFindMatches(summary.videoId, lines, trimmed);
      const top = results[0];
      if (!top) {
        rejected.push({ videoId: summary.videoId, phrase: trimmed, reason: "no_hybrid_match" });
        continue;
      }

      const strict = evaluateMomentMaterialization(trimmed, top.snippet, minStrict);
      const soft = strict.pass ? strict : evaluateMomentMaterialization(trimmed, top.snippet, minSoft);
      const gate = strict.pass ? strict : soft;

      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      if (!job.fromSemantic && wordCount === 1 && !strict.pass) {
        rejected.push({
          videoId: summary.videoId,
          phrase: trimmed,
          reason: "keyword_single_token_requires_strict",
          totalScore: gate.totalScore,
        });
        continue;
      }

      if (!gate.pass || !gate.snippet.ok) {
        rejected.push({
          videoId: summary.videoId,
          phrase: trimmed,
          reason: gate.snippet.reason ?? `below_threshold_${gate.totalScore}`,
          totalScore: gate.totalScore,
        });
        continue;
      }

      if (!strict.pass && gate.pass) {
        if (gate.phrase.score < -25) {
          rejected.push({
            videoId: summary.videoId,
            phrase: trimmed,
            reason: "soft_gate_blocked_weak_phrase",
            totalScore: gate.totalScore,
          });
          continue;
        }
      }

      const id = computePublicMomentStableId(summary.videoId, top.start, trimmed);
      if (preservedIds.has(id)) continue;

      const extractionKinds = job.fromSemantic ? job.kinds : [];
      const semanticRank = scoreSemanticMomentRanking({
        phrase: trimmed,
        snippet: top.snippet,
        extractionKinds,
        phraseCorpusFrequency: freqForPhrase(trimmed),
        segmentCount: cached.segments.length,
        channelName: indexed?.channelName ?? undefined,
      });

      let explanationBoost = 0;
      for (const k of extractionKinds) {
        if (["explanation", "definition", "framework", "argument", "comparison"].includes(k)) {
          explanationBoost += 4;
        }
      }
      if (job.fromSemantic) explanationBoost += 10;

      const combinedScore = Math.round(gate.totalScore + semanticRank.total * 0.38 + explanationBoost);

      const baseSlug = slugifyQuery(trimmed);
      const canonicalSlug = disambiguateSlug(baseSlug, usedSlugs);

      const baseRow: PublicMomentRecord = {
        id,
        videoId: summary.videoId,
        phrase: trimmed,
        canonicalSlug,
        startSeconds: top.start,
        timestamp: top.timestamp,
        snippet: top.snippet,
        youtubeUrl: top.openUrl,
        videoTitle: indexed?.title,
        channelName: indexed?.channelName ?? undefined,
        category,
        topic,
        materializedAt: new Date().toISOString(),
        semantic: buildSemanticLayer(
          {
            id,
            videoId: summary.videoId,
            phrase: trimmed,
            canonicalSlug,
            startSeconds: top.start,
            timestamp: top.timestamp,
            snippet: top.snippet,
            youtubeUrl: top.openUrl,
            videoTitle: indexed?.title,
            channelName: indexed?.channelName ?? undefined,
            category,
            topic,
            materializedAt: new Date().toISOString(),
          },
          extractionKinds,
          top.snippet,
          indexed,
          freqForPhrase(trimmed),
          cached.segments.length
        ),
      };

      pool.push({
        ...baseRow,
        qualityScore: combinedScore,
        fromSemantic: job.fromSemantic,
        extractionKinds,
      });
    }
  }

  pool.sort((a, b) => momentQualityRankingKey(b) - momentQualityRankingKey(a));

  const byId = new Map<string, Candidate>();
  for (const c of pool) {
    const prev = byId.get(c.id);
    if (!prev || (c.qualityScore ?? 0) > (prev.qualityScore ?? 0)) {
      byId.set(c.id, c);
    }
  }

  let unique = [...byId.values()].sort(
    (a, b) =>
      Number(b.fromSemantic) - Number(a.fromSemantic) ||
      momentQualityRankingKey(b) - momentQualityRankingKey(a)
  );
  unique = dedupeGreedyNearDuplicates(unique);

  const reserved = preserved.length;
  /** When preserving URLs, keep all legacy rows and append new semantic/keyword rows up to additive budget. */
  const effectiveCap =
    PRESERVE_EXISTING && reserved > 0
      ? Math.min(PRESERVE_TOTAL_MAX, reserved + SEMANTIC_ADDITIVE_CAP)
      : CAP;

  const perVideo = new Map<string, number>();
  for (const p of preserved) {
    perVideo.set(p.videoId, (perVideo.get(p.videoId) ?? 0) + 1);
  }

  const moments: PublicMomentRecord[] = [...preserved];

  for (const c of unique) {
    if (moments.length >= effectiveCap) break;
    const n = perVideo.get(c.videoId) ?? 0;
    if (n >= MAX_PER_VIDEO) continue;
    if (moments.some((m) => areNearDuplicateMoments(m, c))) continue;

    perVideo.set(c.videoId, n + 1);
    const { qualityScore, fromSemantic, extractionKinds, ...rest } = c;
    void fromSemantic;
    void extractionKinds;
    moments.push({ ...rest, qualityScore });
  }

  if (reserved > CAP) {
    console.warn(
      `[materialize-public-moments] Preserved ${reserved} rows exceed baseline cap ${CAP}; additive semantic budget may still append new rows (total ${moments.length}).`
    );
  }

  const accepted: AcceptLog[] = moments.map((m) => ({
    videoId: m.videoId,
    phrase: m.phrase,
    totalScore: m.qualityScore ?? 0,
    fromSemantic: Boolean(m.semantic?.extractionKinds && m.semantic.extractionKinds.length > 0),
  }));

  const semanticMoments = moments.filter((m) => (m.semantic?.extractionKinds?.length ?? 0) > 0);
  const avgSemanticRank =
    semanticMoments.length > 0
      ? semanticMoments.reduce((s, m) => s + (m.semantic?.totalSemanticRank ?? 0), 0) / semanticMoments.length
      : 0;

  const topicCoverage = new Map<string, number>();
  for (const m of semanticMoments) {
    const p = m.semantic?.topics.primaryTopic ?? "unknown";
    topicCoverage.set(p, (topicCoverage.get(p) ?? 0) + 1);
  }

  const duplicateClusters = clusterNearDuplicatePhrases(
    unique.map((c) => ({ videoId: c.videoId, startSeconds: c.startSeconds, phrase: c.phrase }))
  );

  const outPath = join(process.cwd(), "data/public-moments.json");
  writeFileSync(outPath, `${JSON.stringify({ moments }, null, 2)}\n`, "utf-8");

  const validationPath = join(process.cwd(), "data/public-moments-validation.json");
  writeFileSync(
    validationPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cap: CAP,
        effectiveCap,
        semanticAdditiveCap: SEMANTIC_ADDITIVE_CAP,
        preserveTotalMax: PRESERVE_TOTAL_MAX,
        keywordPool: KEYWORD_POOL,
        semanticPool: SEMANTIC_POOL,
        maxPerVideo: MAX_PER_VIDEO,
        preserveExisting: PRESERVE_EXISTING,
        preservedCount: reserved,
        minStrict,
        minSoft,
        acceptedCount: accepted.length,
        finalCount: moments.length,
        rejectedSample: rejected.slice(0, 500),
        acceptedSample: accepted.slice(0, 220),
      },
      null,
      2
    )}\n`,
    "utf-8"
  );

  const evalPath = join(process.cwd(), "data/public-moments-semantic-evaluation.json");
  writeFileSync(
    evalPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        semanticQuality: {
          momentsWithSemanticLayer: semanticMoments.length,
          totalMoments: moments.length,
          avgTotalSemanticRank: Math.round(avgSemanticRank * 100) / 100,
        },
        rejectedPhrasesReport: {
          totalRejected: rejected.length,
          byReason: (() => {
            const m = new Map<string, number>();
            for (const r of rejected) {
              const key = (r.reason.split(":")[0] ?? r.reason).trim();
              m.set(key, (m.get(key) ?? 0) + 1);
            }
            return Object.fromEntries(m);
          })(),
          sample: rejected.slice(0, 200),
        },
        topicCoverageReport: Object.fromEntries([...topicCoverage.entries()].sort((a, b) => b[1] - a[1])),
        duplicateClusterReport: duplicateClusters.slice(0, 120),
      },
      null,
      2
    )}\n`,
    "utf-8"
  );

  const reportPath = join(process.cwd(), "PUBLIC_MOMENT_QUALITY_REPORT.md");
  writeFileSync(
    reportPath,
    buildMarkdownReport({
      accepted,
      rejectedSample: rejected,
      moments,
      minStrict,
      minSoft,
      cap: CAP,
      preservedCount: reserved,
      semanticShare: accepted.filter((a) => a.fromSemantic).length,
    }),
    "utf-8"
  );

  console.log(`Wrote ${moments.length} public moments to ${outPath}`);
  console.log(`Wrote validation log to ${validationPath}`);
  console.log(`Wrote semantic evaluation to ${evalPath}`);
  console.log(`Wrote ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
