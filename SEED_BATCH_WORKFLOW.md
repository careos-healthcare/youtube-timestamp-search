# Seed batch workflow

How to build high-quality ingestion batches without polluting Supabase with videos that lack captions.

## Golden rule

**Never seed a raw CSV.**

Always:

1. Generate or assemble **raw candidates**
2. Run **transcript availability preflight**
3. Seed only the **`.available.csv`** output

Raw files are drafts. Available files are the production input.

## File types

| File | Purpose | Seed? |
|------|---------|-------|
| `seed-videos-raw-batch-00N.csv` | Unverified candidates from catalog or manual curation | No |
| `seed-videos-raw-batch-00N.available.csv` | Verified captions/transcripts | **Yes** |
| `seed-videos-raw-batch-00N.rejected.csv` | Failed preflight with `reason` | No |

Manual batches follow the same rule:

| File | Seed? |
|------|-------|
| `data/seed-videos-batch-001.csv` | No |
| `data/seed-videos-batch-001.available.csv` | **Yes** |

## Channel catalog

Known official channels and curated long-form videos live in:

```
lib/seed-channel-catalog.ts
```

Each channel entry includes:

- `slug` — filter key for generation
- `name` — CSV `creator` column
- `category` — CSV `category` column
- `videos[]` — candidate `videoId`, `topic`, `priority`

Add new evergreen videos here as you discover reliable caption coverage. Prefer:

- Official channel uploads
- Full courses, podcasts, and interviews (10+ minutes)
- Public videos with captions enabled

Avoid shorts, repost spam, music, and compilation channels.

## Automated workflow (recommended)

Generate a batch from the catalog, verify captions, and write all three CSV outputs:

```bash
npm run generate:seed-batch -- --batch 003 --limit 100
```

Filter by category:

```bash
npm run generate:seed-batch -- --batch 003 --limit 75 \
  --category "programming tutorials" \
  --category "AI podcasts"
```

Filter by channel slug:

```bash
npm run generate:seed-batch -- --batch 004 --limit 30 --channel freecodecamp
```

List catalog channels:

```bash
npm run generate:seed-batch -- --list-channels
```

Slower rate limit for large runs:

```bash
CHECK_DELAY_MS=2500 npm run generate:seed-batch -- --batch 003 --limit 100
```

### What the generator does

1. Reads `lib/seed-channel-catalog.ts`
2. Excludes any `video_id` already present in `data/*.csv`
3. Round-robins across matching channels for diversity
4. Writes `data/seed-videos-raw-batch-00N.csv`
5. Runs availability checks (no Supabase writes, no cache writes)
6. Writes `.available.csv` and `.rejected.csv`

### Seed the verified batch

```bash
npm run seed:transcripts:csv -- data/seed-videos-raw-batch-003.available.csv
```

## Manual workflow

If you hand-edit a CSV instead of using the generator:

```bash
# 1. Create raw candidates
cp data/seed-videos.example.csv data/my-raw-batch.csv

# 2. Preflight captions
npm run check:transcripts -- data/my-raw-batch.csv

# 3. Seed verified rows only
npm run seed:transcripts:csv -- data/my-raw-batch.available.csv
```

## Quality checklist

Before seeding any `.available.csv`:

- [ ] File name ends with `.available.csv`
- [ ] Preflight summary shows acceptable `unavailable` rate
- [ ] Review `rejected.csv` for patterns (shorts, private videos, no captions)
- [ ] Categories match discovery slugs (`programming tutorials`, `AI podcasts`, etc.)
- [ ] No duplicate `video_id` values in the file
- [ ] Supabase migration `002_add_transcript_category.sql` applied

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run generate:seed-batch` | Catalog → raw + availability verify |
| `npm run check:transcripts` | Preflight an existing raw CSV |
| `npm run seed:transcripts:csv` | Index verified `.available.csv` only |

## Related docs

- `SEED_TRANSCRIPTS.md` — seed CLI and CSV columns
- `INGESTION_ROADMAP.md` — week 1 quotas and tracking
