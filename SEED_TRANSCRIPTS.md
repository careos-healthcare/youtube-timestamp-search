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

## CLI examples

Index one or more video IDs or URLs:

```bash
npm run seed:transcripts -- dQw4w9WgXcQ
```

```bash
npm run seed:transcripts -- https://www.youtube.com/watch?v=dQw4w9WgXcQ https://www.youtube.com/watch?v=PkZNo7MFNFg
```

## CSV examples

Create `data/seed-videos.csv`:

```csv
url,video_id,category,creator,topic
https://www.youtube.com/watch?v=PkZNo7MFNFg,,education,,javascript
,joe-rogan-example-id,podcasts,joe-rogan,psychology
```

Supported columns:

| Column | Description |
|--------|-------------|
| `url` | Full YouTube URL |
| `video_id` | 11-character YouTube video ID |
| `category` | Logged with seed status (optional) |
| `creator` | Used as channel override when oEmbed channel is missing (optional) |
| `topic` | Logged with seed status (optional) |

Run:

```bash
npm run seed:transcripts:csv -- data/seed-videos.csv
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
