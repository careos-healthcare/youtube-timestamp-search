# Topic-deepening controlled ingest — RAG

Generated: 2026-05-16T16:02:21.285Z

## Governance

- Queue basis: `data/topic-deepening-queue.json` (priority **15**)
- Approval: `data/topic-deepening-rag-approval.json`
- Seed queue source: `topic-deepening-rag`
- Max ingest: **0**

## Planned videos

- **w1-011** `00GKzGyWFEs` — Hugging Face: Welcome to the Hugging Face course…
- **w1-012** `H39Z_720T5s` — Hugging Face: The Transformer architecture…

## Ingestion run

```json
{
  "summary": {
    "eligible": 1,
    "alreadyIndexed": 0,
    "cachedTranscript": 0,
    "inSeedQueue": 1,
    "inCorpusQueue": 0,
    "csvExcluded": 0,
    "unavailableTranscript": 0,
    "queued": 1,
    "ingested": 0,
    "failed": 0
  },
  "transcriptGate": {
    "checked": 1,
    "available": 1,
    "unavailable": 0,
    "passed": true,
    "minChecksForGate": 3,
    "maxUnavailableRate": 0.5
  },
  "worker": {
    "processed": 2,
    "indexed": 2,
    "skipped": 0,
    "failed": 0,
    "rejected": 0
  }
}
```

## RAG research-grade delta

| | Before | After |
| --- | --- | --- |
| Tier | strong | elite |
| Distance to elite | 0.030 | 0.000 |
| Trust score | 55 | 70 |
| Moments | 9 | 21 |

## Deepening status

- Before: **deepen_next**
- After: **ready_to_showcase**
- Showcase-ready: **yes**

## Notes

- Patched topic field on 2 pending seed job(s).
- Worker indexed 2 / processed 2 for RAG batch.
- Outcome refreshed from current corpus after materialize + governance reports.

## Next steps

1. `npm run materialize:public-moments` after worker indexes transcripts.
2. `npm run report:research-graph` && `npm run report:topic-deepening` && `npm run report:research-grade-topics`.
3. Re-run this ingest script with `--report-only` to refresh outcome without writes.
