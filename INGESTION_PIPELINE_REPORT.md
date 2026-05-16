# Ingestion pipeline report

Generated: 2026-05-16T04:12:27.229Z

## Queue status

| Metric | Value |
|--------|------:|
| Total jobs | 5 |
| Pending | 2 |
| Processing | 0 |
| Completed | 3 |
| Failed | 0 |
| Skipped | 0 |
| Rejected | 0 |
| Queue updated | 2026-05-16T04:12:27.228Z |

## Paths

| Artifact | Path |
|----------|------|
| Queue file | `/Users/chiragpatel/Desktop/spp20/youtube-timestamp-search/data/ingestion/queue.json` |
| Rejected CSV | `/Users/chiragpatel/Desktop/spp20/youtube-timestamp-search/data/ingestion/rejected.csv` |
| Failed CSV | `/Users/chiragpatel/Desktop/spp20/youtube-timestamp-search/data/ingestion/failed.csv` |
| Last discovery | `/Users/chiragpatel/Desktop/spp20/youtube-timestamp-search/data/ingestion/last-discovery.json` |

## Commands

```bash
npm run ingest:discover-channels
npm run ingest:queue -- --limit 50 --verify
npm run ingest:worker -- --limit 10
npm run ingest:refresh -- --limit 20
npm run ingest:validate
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEED_DELAY_MS` | 1500 | Delay between ingest/refresh operations |
| `CHECK_DELAY_MS` | 1500 | Delay between availability checks |
| `INGEST_WORKER_BATCH` | 10 | Default worker batch size |
| `INGEST_REFRESH_LIMIT` | 20 | Default refresh batch size |

## Legacy CSV seeding (unchanged)

```bash
npm run generate:seed-batch -- --batch 006 --limit 100
npm run check:transcripts -- data/seed-videos-raw-batch-006.csv
npm run seed:transcripts:csv -- data/seed-videos-raw-batch-006.available.csv
```
