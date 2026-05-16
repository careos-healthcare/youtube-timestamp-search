# Wave 1 ingestion — dry run / classification

Generated: 2026-05-16T04:12:06.687Z

## Flags

| simulate | writesIntended | dryRun | reportOnly | skipVerify | writeQueue | ingest | limit | start |
|----------|----------------|--------|------------|------------|------------|--------|------:|------:|
| false | true | false | false | false | true | false | 5 | 0 |

## Transcript gate

| checked | available | unavailable | passed |
|--------:|----------:|--------------:|--------|
| 5 | 5 | 0 | true |

## Summary counts

| eligible | already_indexed | cached_transcript | in_seed_queue | in_corpus_queue | csv_excluded | unavailable_transcript | queued | ingested | failed |
|---------:|----------------:|------------------:|--------------:|----------------:|-------------:|-------------------------:|-------:|---------:|-------:|
| 5 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 |

## Source quality (window)

- Mean score: 100.0
- Tier counts: {"A":5,"B":0,"C":0,"D":0}

## Enqueue

```json
{
  "added": 5,
  "skippedDuplicate": 0,
  "skippedCached": 0,
  "skippedInQueue": 0
}
```

## Corpus quality snapshots

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
    "momentCount": 176,
    "uniqueVideos": 53,
    "uniqueCreators": 14,
    "lowTierShare": 0.09090909090909091,
    "highTierShare": 0.44886363636363635,
    "citeRichShare": 0.3181818181818182
  }
}
```

## Proceed to remaining 31?

true

## Per-row

| id | videoId | status | detail |
|:---|:--------|:-------|:-------|
| w1-001 | qTogNUV3CAI | queued | transcript ok |
| w1-002 | n1E9IZfvGMA | queued | transcript ok |
| w1-003 | 5t1vTLU7s40 | queued | transcript ok |
| w1-004 | cdiD-9MMpb0 | queued | transcript ok |
| w1-005 | TrdevFK_am4 | queued | transcript ok |
