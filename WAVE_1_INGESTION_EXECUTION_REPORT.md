# Wave 1 ingestion — execution report

Generated: 2026-05-16T04:14:00.000Z

This document summarizes Phase 2C: controlled dry-run, queue write, capped live worker, and downstream corpus artifacts.

## Commands executed

1. `npm run ingest:wave-1 -- --dry-run --limit=10` — completed with exit code 0. Transcript checks ran; no queue or worker mutations. (The machine-readable `data/wave-1-ingestion-results.json` was later overwritten by step 2; the dry-run classification for the first 10 rows matched expectations in the live environment.)
2. `npm run ingest:wave-1 -- --write-queue --limit=5` — completed with exit code 0. Five Wave 1 seeds enqueued with `source: "wave-1"`. Transcript gate: 5 checked, 5 available, 0 unavailable.
3. `npm run ingest:worker -- --limit 3` — completed with exit code 0. Three jobs processed from the queue: `qTogNUV3CAI`, `n1E9IZfvGMA`, `5t1vTLU7s40` → **indexed** (0 failed, 0 rejected). Two jobs remain queued for a later controlled batch (`cdiD-9MMpb0`, `TrdevFK_am4`).
4. Post-ingest regeneration: `npm run materialize:public-moments`, `npm run topic-coverage-report`, `npm run missing-corpus-report`, `npm run corpus-health-report`.

## Dry-run / classification artifact

See `WAVE_1_INGESTION_DRY_RUN_REPORT.md` (current file reflects the `--write-queue --limit=5` window: five Tier A candidates, all transcripts available) and `data/wave-1-ingestion-results.json` for the merged summary including enqueue counts, worker counts, and corpus snapshots.

## Queued candidates (window start 0, limit 5)

| id | videoId | channel | status |
|----|---------|---------|--------|
| w1-001 | qTogNUV3CAI | Dwarkesh Patel | queued → **indexed** |
| w1-002 | n1E9IZfvGMA | Dwarkesh Patel | queued → **indexed** |
| w1-003 | 5t1vTLU7s40 | Lex Fridman | queued → **indexed** |
| w1-004 | cdiD-9MMpb0 | Lex Fridman | queued (pending) |
| w1-005 | TrdevFK_am4 | Yannic Kilcher | queued (pending) |

## Failures

None in transcript gate, enqueue, or worker for the steps above.

## Corpus quality — before vs after (post-materialization)

Snapshots align with `corpusMetricsBefore` / `corpusMetricsAfter` in `data/wave-1-ingestion-results.json` (after = following worker + `materialize:public-moments`).

| Metric | Before (pre–Wave 1 queue write) | After (post worker + materialize) |
|--------|--------------------------------|-----------------------------------|
| Indexed moments | 176 | 220 |
| Unique videos | 53 | 54 |
| Unique creators | 14 | 14 |
| Low-tier share | ~0.091 | ~0.073 |
| High-tier share | ~0.449 | ~0.559 |
| Citation-rich share | ~0.318 | ~0.455 |

Low-tier share **decreased** and citation-rich share **increased**. No quality regression; ingestion was not forced beyond the capped worker.

## Proceed to remaining 31 candidates?

**Yes, with the same controls:** transcript gate on each batch, explicit `--limit`, dedupe against cache/queues/index, and worker cap (≤3 jobs per invocation unless you intentionally widen operations). The automated `proceedToRemaining31` flag in `wave-1-ingestion-results.json` remains `true` given the gate passed and metrics improved.

## Queue / worker (machine-readable excerpt)

```json
{
  "enqueue": {
    "added": 5,
    "skippedDuplicate": 0,
    "skippedCached": 0,
    "skippedInQueue": 0
  },
  "worker": {
    "processed": 3,
    "indexed": 3,
    "skipped": 0,
    "failed": 0,
    "rejected": 0
  }
}
```

## Corpus quality delta (JSON)

```json
{
  "before": {
    "momentCount": 176,
    "uniqueVideos": 53,
    "uniqueCreators": 14,
    "lowTierShare": 0.09090909090909091,
    "highTierShare": 0.44886363636363635,
    "citeRichShare": 0.3181818181818182
  },
  "after": {
    "momentCount": 220,
    "uniqueVideos": 54,
    "uniqueCreators": 14,
    "lowTierShare": 0.07272727272727272,
    "highTierShare": 0.5590909090909091,
    "citeRichShare": 0.45454545454545453
  }
}
```
