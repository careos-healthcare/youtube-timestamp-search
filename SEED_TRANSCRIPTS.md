# Bulk transcript seeding

Use the seed pipeline to index many YouTube transcripts into Supabase in one run.

## Prerequisites

1. Run the Supabase migration: `supabase/migrations/001_create_transcript_index.sql`
2. Configure `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Install dependencies: `npm install`

## Recommended workflow

1. **Create a raw CSV** with candidate videos (`url`, `video_id`, `category`, `creator`, `topic`, `priority`).
2. **Run the availability checker** to test captions without saving anything:

```bash
npm run check:transcripts -- data/seed-videos-batch-001.csv
```

This writes:

- `data/seed-videos-batch-001.available.csv` — videos with fetchable transcripts
- `data/seed-videos-batch-001.rejected.csv` — failures with a `reason` column

Optional slower rate limit:

```bash
CHECK_DELAY_MS=2500 npm run check:transcripts -- data/my-raw-batch.csv
```

3. **Seed only the available CSV** into Supabase:

```bash
npm run seed:transcripts:csv -- data/seed-videos-batch-001.available.csv
```

The checker uses `fetchTranscriptFromYoutube` only. It does **not** write to Supabase or the local transcript cache.

## CLI examples

Index one or more video IDs or URLs:

```bash
npm run seed:transcripts -- dQw4w9WgXcQ
```

```bash
npm run seed:transcripts -- https://www.youtube.com/watch?v=dQw4w9WgXcQ https://www.youtube.com/watch?v=PkZNo7MFNFg
```

## CSV examples

Copy the starter file and edit as needed:

```bash
cp data/seed-videos.example.csv data/seed-videos.csv
```

`data/seed-videos.example.csv` includes curated rows across:

- programming tutorials
- AI podcasts
- business interviews
- finance education
- self-improvement podcasts

Minimal custom CSV:

```csv
url,video_id,category,creator,topic,priority
https://www.youtube.com/watch?v=PkZNo7MFNFg,PkZNo7MFNFg,programming tutorials,freeCodeCamp,javascript,1
```

Supported columns:

| Column | Description |
|--------|-------------|
| `url` | Full YouTube URL (required unless `video_id` is set) |
| `video_id` | 11-character YouTube video ID (required unless `url` is set) |
| `category` | Logged with seed status (optional) |
| `creator` | Used as channel override when oEmbed channel is missing (optional) |
| `topic` | Logged with seed status (optional) |
| `priority` | Integer `1`–`5` for batch ordering notes (optional) |

CSV validation rejects malformed files before ingestion starts. Common failures:

- missing `url` / `video_id` columns in the header
- rows with neither `url` nor `video_id`
- invalid YouTube IDs or URLs
- mismatched `url` and `video_id` on the same row
- wrong column counts
- duplicate `video_id` values
- invalid `priority` values

Run:

```bash
npm run seed:transcripts:csv -- data/seed-videos.csv
```

Or use the example file directly:

```bash
npm run seed:transcripts:csv -- data/seed-videos.example.csv
```

## Behavior

- Uses existing `fetchTranscriptFromYoutube`, oEmbed metadata, and Supabase save layer
- Skips videos already present in cache / Supabase
- Never caches failed transcript fetches
- Waits `1500ms` between videos by default (`SEED_DELAY_MS` override)
- Prints per-video status: `INDEXED`, `SKIPPED`, or `FAILED`
- Prints final summary: `total`, `indexed`, `skipped`, `failed`

## Example output

```text
Starting bulk transcript ingestion for 3 video(s)...
Rate limit delay: 1500ms between requests

1/3 [INDEXED] PkZNo7MFNFg (category=education · topic=javascript) — 842 segments · "JavaScript Tutorial"
2/3 [SKIPPED] dQw4w9WgXcQ — Already indexed in cache
3/3 [FAILED] invalid123 — Transcript unavailable for this video.

Seed transcript summary
total: 3
indexed: 1
skipped: 1
failed: 1
```

## Notes

- The script loads `.env.local` automatically; no Next.js server required
- Without Supabase env vars, transcripts are saved to the local fallback cache only
- Exit code is `1` if any video fails, `0` otherwise
