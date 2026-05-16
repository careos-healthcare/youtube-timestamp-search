# Selective corpus expansion (Phase 2)

This document describes the **ingestion-quality infrastructure** for a curated, citation-friendly spoken-knowledge corpus. The objective is **not** “more videos,” but **high-trust, comparison-friendly explanations** with disciplined intake.

## Allowlist philosophy

- **Curated over comprehensive**: `data/source-allowlists/*.json` lists channels (and metadata) we *want* to bias toward—research, engineering, lectures, and conference talks—not the open web.
- **Nullable channel IDs**: Rows may omit `channelId` until verified; matching falls back to normalized channel names (`lib/corpus/source-allowlists.ts`).
- **Trust priors**: Each row carries `trustTier`, `explanationDensityEstimate`, `citationLikelihood`, and `ingestPriority` so scoring and queues can reason about *why* a source is preferred without hard-coding channel names in heuristics.

## Source scoring (`scoreIngestionSource`)

Implemented in `lib/corpus/source-quality.ts` with human-readable tier copy in `lib/corpus/source-score-explanations.ts`.

**Positive signals (examples)**

- Curated allowlist match (strong boost + category/trust propagation).
- Transcript available and reasonably long (long-form prior).
- Long runtime estimate (lecture-shaped).
- Title tokens suggesting technical depth, education, or citation-friendly language.

**Penalties (examples)**

- Reaction / compilation / entertainment-only patterns.
- Clickbait language.
- Very short transcripts or runtimes (clip-shaped).

**Outputs**

- Numeric `score`, letter `tier`, `reasons`, `penalties`, and `ingestRecommendation` (`promote` | `candidate` | `reject`).

**Known weaknesses**

- Title-only signals are gameable; allowlist is the real anchor.
- Transcript length ≠ information density; segment counts are a rough proxy.
- Non-English and niche domains are under-modeled.

## Ingestion strategy

1. **Preflight** with `scoreIngestionSource` before any heavy work.
2. **Route** into JSON-backed queues under `data/ingestion-queues/` (`lib/corpus/ingestion-queue.ts`): `high_priority`, `candidate`, `rejected`, `requested`.
3. **Dedupe** aggressively (`dedupeSource`, shared keys) so the same channel/URL is not queued repeatedly.
4. **Promote** manually or via policy from `candidate` → `high_priority`; **reject** with an auditable reason string.
5. **User requests**: `RequestSourceIndexForm` still emits `source_index_request` for analytics; `POST /api/corpus/request-index` appends to the **requested** queue and emits `source_request_received` via `enqueueRequestedSource` (filesystem; may fail on read-only serverless—acceptable degradation).

Workers are intentionally **out of scope** for this phase.

## Topic coverage logic

`buildTopicCoverageReport` (`lib/corpus/topic-coverage.ts`) groups public moments by `topic` and computes:

- Volume: moments, unique videos, unique creators.
- **Authority diversity**: distinct authority labels from `evaluateSourceAuthorityForPublicMoment`.
- **Role coverage**: beginner / technical / counterpoint / citation-rich shares using `classifyExplanationFromText` and semantic citations.
- **Collection coverage**: overlap with `STATIC_PUBLIC_COLLECTIONS` slugs.
- **Phrase saturation** (from `lib/corpus/dedupe.ts`): top repeated phrases—spam / monoculture risk.
- **Flags**: `weakComparisonDepth` (few videos or few authority buckets), `missingBeginner`, `missingCounterpoint`.

Run: `npm run topic-coverage-report` → `TOPIC_COVERAGE_REPORT.md`, `data/topic-coverage.json`.

## Missing corpus intelligence

`buildMissingCorpusReport` (`lib/corpus/missing-corpus.ts`) merges:

- Optional `data/analytics/source-index-requests.json` (array of `{ requestedUrl, topic?, … }` exports mirroring `source_index_request`).
- Heuristic gaps from topic coverage (low depth / missing roles).
- **High-priority allowlist channels** absent from indexed moment channel names (normalized fuzzy match).

Run: `npm run missing-corpus-report` → `MISSING_CORPUS_REPORT.md`, `data/missing-corpus.json`.  
If no real requests file exists, the script reads `data/analytics/source-index-requests.sample.json`.

## Anti-spam / hygiene (`lib/corpus/dedupe.ts`)

- **Title similarity**: token Jaccard and duplicate title clustering.
- **Transcript-ish overlap**: phrase counts per topic to detect saturation.
- **Queue dedupe**: stable `dedupeKey` prevents duplicate enqueue.

## Corpus health snapshot

`npm run corpus-health-report` → `CORPUS_HEALTH_REPORT.md` with headline counts, authority mix, topic distribution, citation-rich %, weak-signal %, tier mix, and a tutorial/explanation heuristic ratio.

## Analytics events (no dashboards)

Extended `AnalyticsEventName` in `lib/analytics.ts`. Server/client flows may emit:

| Event | Typical source |
|-------|----------------|
| `source_allowlist_match` | `scoreIngestionSource` |
| `ingestion_source_scored` | `scoreIngestionSource` |
| `source_promoted` | `promoteSource` |
| `source_rejected` | `rejectSource` |
| `source_request_received` | `enqueueRequestedSource` / API |
| `missing_corpus_detected` | Report scripts when thresholds hit |

`recordCorpusPipelineEvent` (`lib/corpus/corpus-analytics.ts`) also appends JSON lines to `data/analytics/corpus-pipeline-events.jsonl` (gitignored).

## Future expansion

- Wire **failed / low-result searches** from `app/api/search` into `source-index-requests.json` or a dedicated warehouse (not done here to avoid new storage deps).
- Replace JSON queues with a durable job store when workers land.
- Periodic **re-score** of queued items as transcript samples arrive.
- Language-specific title/transcript models.

## File map

| Area | Path |
|------|------|
| Allowlists | `data/source-allowlists/*.json` |
| Types + queues | `lib/corpus/source-types.ts`, `ingestion-queue.ts` |
| Scoring | `lib/corpus/source-quality.ts`, `source-score-explanations.ts` |
| Dedupe | `lib/corpus/dedupe.ts` |
| Coverage / missing | `lib/corpus/topic-coverage.ts`, `missing-corpus.ts` |
| Reports | `scripts/topic-coverage-report.ts`, `missing-corpus-report.ts`, `corpus-health-report.ts` |
| Request API | `app/api/corpus/request-index/route.ts` |
