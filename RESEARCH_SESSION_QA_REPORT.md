# Research session instrumentation — post-deploy QA

Generated: 2026-05-16

## Deployed commit

| Item | Value |
|------|--------|
| **Git SHA (short)** | `19ec799` |
| **Branch** | `main` |
| **Vercel production URL** | https://youtube-timestamp-search-five.vercel.app |
| **Canonical site** | https://www.youtubetimesearch.com (when aliased) |
| **Deployment** | `dpl_7NYDrKq2QggpFbLYQK1meA5kiUf6` — `vercel --prod` completed successfully |

## Manual test path (recommended)

Perform once in a **private/incognito** window on production after deploy:

1. Open **homepage** (`/`)
2. **Search** one topic (e.g. `kubernetes explained`) → submit
3. From results or chips, open one **topic page** (`/topic/...`)
4. Open one **moment** (`/moment/...`)
5. **Copy** one citation format (Markdown or plain text)
6. **Save** the moment (library button)
7. Click one **related moment** on the canonical page
8. Open **`/saved`**
9. **Export** saved library (Markdown or timestamp links) if clips exist
10. *(Optional)* Visit a **collection** twice (`/collections/...`) to trigger `collection_revisit`

Record `researchSessionId` from browser DevTools → Network → `POST /api/analytics/event` request payloads.

## Synthetic pipeline test (automated)

A QA script posted the same event sequence to production `POST /api/analytics/event` with `qa: true` and `researchSessionId: qa-rs-2026-05-16-14-00`.

| Event | HTTP status |
|-------|------------:|
| `research_session_started` | 200 |
| `research_chain_depth` | 200 |
| `research_session_extended` (×2) | 200 |
| `topic_page_view` | 200 |
| `citation_workflow_completed` | 200 |
| `saved_clip` | 200 |
| `saved_research_return` | 200 |
| `research_export_completed` | 200 |
| `collection_page_view` | 200 |
| `collection_revisit` | 200 |

**All ingest endpoints returned 200.**

## Events observed (Supabase `search_analytics_events`)

| Check | Result |
|-------|--------|
| Local `loadResearchSessionEvents` after QA run | **0 rows** |
| QA session rows in DB | **Not found** |
| `npm run report:research-sessions` | **0 sessions**, **0 events** |

### Root cause

Production Vercel project has **no `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`** in environment (`vercel env ls production` shows no Supabase vars). The analytics route accepts POSTs but **skips DB insert** when the admin client is unconfigured.

Client instrumentation still fires **Vercel Analytics** via `trackEvent` / beacon path; **server-side session reports** require Supabase.

## Report output (post-QA)

From `npm run report:research-sessions` (local, no Supabase credentials):

| Metric | Value |
|--------|------:|
| Events analyzed | 0 |
| Sessions analyzed | 0 |
| Average research depth | 0.0 |
| Serious research proxy | 0.0% |

See `RESEARCH_SESSION_REPORT.md` and `data/research-session-report.json`.

## Missing / not verified

| Item | Status |
|------|--------|
| `research_session_started` in Supabase | Not verified (no DB config) |
| `research_session_extended` in Supabase | Not verified |
| `research_chain_depth` in Supabase | Not verified |
| `citation_workflow_completed` in Supabase | Not verified |
| `saved_research_return` in Supabase | Not verified |
| `collection_revisit` in Supabase | Not verified (synthetic POST returned 200 only) |
| `research_compare_used` | Not exercised in QA path |
| `repeat_topic_research` | Not exercised (requires same topic twice in one tab session) |
| End-to-end browser manual session | **Human verification pending** |

## Production-ready?

| Layer | Verdict |
|-------|---------|
| **Client instrumentation** (deployed `19ec799`) | **Yes** — hooks on topic, compare, citation, save, related, saved, collections; `ResearchSessionBridge` in layout |
| **Ingest API** | **Yes** — `/api/analytics/event` returns 200 for research events |
| **Persistent session reports** | **No** — configure Supabase on Vercel, then re-run manual test + `npm run report:research-sessions` with local `.env.local` containing service role |
| **Overall for behavioral lock-in measurement** | **Blocked on Supabase env** — not blocked on code |

### Unblock checklist

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel **production** (and preview if desired).
2. Confirm migration `003_search_analytics_events.sql` applied.
3. Repeat manual test path above.
4. Run `vercel env pull .env.local --environment=production` locally, then `npm run report:research-sessions`.
5. Expect `sessionsAnalyzed ≥ 1` and non-zero depth for the test session.

## Regenerate

```bash
npm run report:research-sessions
```
