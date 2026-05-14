# Supabase transcript index setup

This project can persist cached YouTube transcripts in Supabase Postgres so the transcript index survives Vercel deployments and serverless cold starts.

## Required environment variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role key for upserts/search |

Never commit real secrets. Never use the service role key in client components.

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project.
2. Open **Project Settings → API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Run the SQL migration

Open **SQL Editor** in Supabase and run:

`supabase/migrations/001_create_transcript_index.sql`

This creates:

- `transcripts`
- `transcript_segments`
- indexes for `video_id`, full-text search, and optional trigram search
- `search_transcript_index(search_query, result_limit)` RPC
- `updated_at` trigger on `transcripts`

Alternatively, with the Supabase CLI:

```bash
supabase db push
```

## 3. Add env vars locally

Create `.env.local` (not committed):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Restart `npm run dev` after adding env vars.

## 4. Add env vars on Vercel

In the Vercel project:

1. **Settings → Environment Variables**
2. Add `NEXT_PUBLIC_SUPABASE_URL` for Production (and Preview if desired)
3. Add `SUPABASE_SERVICE_ROLE_KEY` for Production only
4. Redeploy

## 5. Test locally

1. Start the app: `npm run dev`
2. Search a YouTube video on the homepage (successful transcript fetch caches to Supabase)
3. Visit `/transcripts` — you should see persisted transcripts (not temporary-cache banner)
4. Test indexed search:

```bash
curl "http://localhost:3000/api/search-index?query=javascript"
```

5. Reopen `/video/VIDEO_ID` — transcript preview should load from the persisted cache

## 6. Verify production

After deploy:

- `https://www.youtubetimesearch.com/transcripts`
- `https://www.youtubetimesearch.com/api/search-index?query=your+term`

Check Supabase **Table Editor** for rows in `transcripts` and `transcript_segments`.

## Fallback mode

If Supabase env vars are missing or the database is unreachable:

- The app continues using in-memory + optional local file cache
- `/transcripts` shows: “Transcript index is running in temporary cache mode”
- Build and transcript search still work

## Security notes

- Service role bypasses RLS — keep it server-side only (`lib/supabase.ts`, API routes, server components).
- Failed transcript fetches are never cached.
- No paid database dependency is required for local development or CI builds.
