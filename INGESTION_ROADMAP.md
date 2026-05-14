# Ingestion roadmap

Operational plan for bulk-indexing YouTube transcripts into Supabase for discovery pages (`/latest`, `/category/[slug]`, `/video/[videoId]`).

## Week 1 target

**Goal: 1,000 indexed videos in week 1.**

| Metric | Target |
|--------|--------|
| Total indexed | 1,000 |
| Timeframe | 7 days |
| Avg per day | ~143 videos/day |
| Avg per batch (50 videos) | ~20 batches/week |

Track progress daily against category quotas below. Re-run failed rows after fixing CSV or caption issues; skipped rows (already indexed) do not count toward the target.

## Category quotas

Category values in CSV are normalized to slugs on write (e.g. `programming tutorials` → `programming-tutorials`).

| Category (CSV value) | Slug | Week 1 quota |
|----------------------|------|--------------|
| programming tutorials | `programming-tutorials` | 300 |
| AI podcasts | `ai-podcasts` | 200 |
| business interviews | `business-interviews` | 200 |
| finance education | `finance-education` | 150 |
| self-improvement podcasts | `self-improvement` | 150 |
| **Total** | | **1,000** |

Suggested batch files:

- `data/batches/programming-tutorials.csv` (split into 3–4 files of ~75–100 rows)
- `data/batches/ai-podcasts.csv`
- `data/batches/business-interviews.csv`
- `data/batches/finance-education.csv`
- `data/batches/self-improvement.csv`

Start from `data/seed-videos.example.csv` as a format reference.

For automated batch generation from known channels, see `SEED_BATCH_WORKFLOW.md`.

## Quality rules

Only index videos that meet **all** of these:

1. **Public YouTube videos only** — no private, unlisted, members-only, or age-gated content that blocks transcript fetch.
2. **Must have captions/transcripts** — manual or auto captions are fine; if the seed script returns `FAILED` / “Transcript unavailable”, drop the row and replace with another candidate.
3. **Evergreen content preferred** — tutorials, interviews, lectures, and long-form podcasts that stay searchable for months/years. Deprioritize breaking news clips and date-stamped livestream fragments unless they have lasting search value.
4. **Avoid copyrighted repost spam** — use official creator channels and primary uploads. Skip re-upload farms, scraped compilations, and channels that mirror content without clear rights.
5. **Avoid low-quality shorts** — skip YouTube Shorts and sub-2-minute clips with thin transcript value. Prefer full episodes, courses, and interviews (typically 10+ minutes with dense captions).

**Priority column guidance:** use `1` for flagship creators and proven caption availability, `2` for solid backups, `3` for experimental rows.

## Prerequisites

1. Apply Supabase migrations:
   - `supabase/migrations/001_create_transcript_index.sql`
   - `supabase/migrations/002_add_transcript_category.sql`
2. Set `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. `npm install`

See `SEED_TRANSCRIPTS.md` for full pipeline behavior and CSV column reference.

## Tracking checklist

### Setup (once)

- [ ] Supabase migrations applied
- [ ] `.env.local` configured with service role key
- [ ] `data/batches/` CSV files prepared per category quota
- [ ] Sample batch validated (no CSV parse errors)
- [ ] Test run on 5–10 rows completed successfully

### Daily (days 1–7)

- [ ] Record starting indexed count (Supabase `transcripts` row count or `/latest` total)
- [ ] Run next CSV batch(es) for the day
- [ ] Log seed summary: `total`, `indexed`, `skipped`, `failed`
- [ ] Update category quota tracker (see table below)
- [ ] Re-queue failed `video_id`s into a `data/batches/retry.csv`
- [ ] Spot-check 3–5 new `/video/[videoId]` pages and matching `/category/[slug]` listings

### Category quota tracker (fill in as you go)

| Category | Quota | Indexed | Remaining | Notes |
|----------|------:|--------:|----------:|-------|
| programming tutorials | 300 | | | |
| AI podcasts | 200 | | | |
| business interviews | 200 | | | |
| finance education | 150 | | | |
| self-improvement podcasts | 150 | | | |
| **Total** | **1,000** | | | |

### Week 1 exit criteria

- [ ] ≥ 1,000 rows in `transcripts` with `category` populated
- [ ] Each category at or above quota (or documented shortfall with reason)
- [ ] Failed rows documented in `data/batches/failed.csv` with failure reason
- [ ] `/categories` and all five category pages show non-empty feeds (or documented empty categories)
- [ ] Sitemap and internal links verified on production

## Example seed commands

Copy the example template:

```bash
cp data/seed-videos.example.csv data/seed-videos.csv
```

Validate and seed a single batch (default 1500ms delay between requests):

```bash
npm run seed:transcripts:csv -- data/seed-videos.csv
```

Category-specific batch examples:

```bash
npm run seed:transcripts:csv -- data/batches/programming-tutorials-01.csv
npm run seed:transcripts:csv -- data/batches/ai-podcasts-01.csv
npm run seed:transcripts:csv -- data/batches/business-interviews-01.csv
npm run seed:transcripts:csv -- data/batches/finance-education-01.csv
npm run seed:transcripts:csv -- data/batches/self-improvement-01.csv
```

Slower rate limit for large runs (reduces fetch failures):

```bash
SEED_DELAY_MS=2500 npm run seed:transcripts:csv -- data/batches/programming-tutorials-02.csv
```

Retry failed rows only:

```bash
npm run seed:transcripts:csv -- data/batches/retry.csv
```

Ad-hoc CLI seed (no CSV):

```bash
npm run seed:transcripts -- PkZNo7MFNFg L_Guz73e6fw
```

Example CSV row:

```csv
url,video_id,category,creator,topic,priority
https://www.youtube.com/watch?v=PkZNo7MFNFg,PkZNo7MFNFg,programming tutorials,freeCodeCamp,javascript,1
```

Expected successful run output ends with:

```text
Seed transcript summary
total: 50
indexed: 47
skipped: 2
failed: 1
```

Exit code `1` if any row fails — review failures before starting the next batch.

## Suggested week 1 schedule

| Day | Focus | Approx. volume |
|-----|--------|----------------|
| 1 | Setup + programming batch 1 | ~75 |
| 2 | Programming batches 2–4 | ~225 |
| 3 | AI podcasts batches 1–2 | ~200 |
| 4 | Business interviews batches 1–2 | ~200 |
| 5 | Finance education batches 1–2 | ~150 |
| 6 | Self-improvement batches 1–2 | ~150 |
| 7 | Retries + quota top-up | remainder |

Adjust batch sizes based on `failed` rate and caption availability in each niche.
