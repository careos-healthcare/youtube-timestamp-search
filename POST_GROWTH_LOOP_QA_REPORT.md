# Post–growth-loop production QA

**Repo:** `youtube-timestamp-search`  
**Verified HEAD (after pull):** `7d85621047ec88b956bc6f578ebeb4d8d0b04b6c` (`7d85621` — growth loop merge)  
**Stabilization commit:** (this report ships with the “Stabilize growth loop production QA” commit)

## 1. Automated checks (local, post-patch)

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | **Pass** | — |
| `npm run build` | **Pass** | — |
| `npm run validate:query-expansion` | **Pass** | — |
| `npm run audit:seo` | **Run / flaky** | Hits production; video routes can intermittently return **504** (gateway). **Mitigations:** (a) video page stabilization in this commit, (b) audit `fetchPage` **retries once** on **502/503/504/429** with **50s** client timeout. Script end phase runs **local** `getSearchLandingData` for every priority slug — expect **multi‑minute** runtime. |

**Production spot-check (curl):** `GET https://www.youtubetimesearch.com/video/gh2_PhgZGsM` → **HTTP 200**, ~6.7s, HTML ~146KB, non-empty `<title>`, `rel="canonical"`, JSON-LD present (cold paths may differ).

## 2. Production video `gh2_PhgZGsM` (504 investigation)

**URL:** `https://www.youtubetimesearch.com/video/gh2_PhgZGsM`

| Question | Finding |
| --- | --- |
| HTTP / latency | **200** in ~**6.7s** (curl, 25s cap); HTML ~146KB — healthy response post-check |
| Title / canonical / JSON-LD | Present in HTML (`<title>`, `rel="canonical"`, `application/ld+json`) |
| Segment count hypothesis | Indexed long-form tutorials can have **large** transcript line counts; cache-miss path previously returned **full** YouTube fetch (ignoring `maxSegments`) — fixed by **capping lines** in `getTranscriptForVideo` |
| `VIDEO_PAGE_MAX_TRANSCRIPT_SEGMENTS` / `VIDEO_PAGE_PROCESSING_SEGMENT_CAP` | Read in `lib/video-page-budgets.ts` and passed into `getTranscriptForVideo({ maxSegments })`; processing uses `processingTranscript` slice to **proc cap**. **Vercel defaults tightened** when env unset (see code). |
| Heavy fallback | `loadVideoPageHeavyPayload` still wraps `computePayload` in `raceWithTimeout`; **inner** transcript fetch race on Vercel (`transcript_fetch_timeout`) returns degraded payload before full work runs away |
| Metadata vs heavy | `generateMetadata` + `VideoPageShell` + JSON-LD run **outside** heavy suspense path; heavy blocks can degrade without stripping **title/meta/canonical** from the shell |

### Code changes (stabilization)

1. **`getTranscriptForVideo`**: always **cap** returned lines to `maxSegments` (fixes cache-miss unbounded return).  
2. **`video-page-budgets`**: stricter **Vercel** defaults (data budget **9200ms**, max segments **1000**, processing cap **520** when env not set).  
3. **`load-video-page-heavy`**: Vercel **sub-budget** (~5.6s cap) on transcript fetch; early **`transcript_fetch_timeout`** payload; smaller preview grid; shorter related/channel races; fewer best-moment slots on Vercel.  
4. **`video-page-heavy.tsx`**: **Best moments** moved below preview sections; **channel moments** moved below `InternalLinksPanel` (HTML/stream order).  
5. **`audit-seo-pages.ts`**: `gh2_PhgZGsM` added to **`SEO_PRIORITY_VIDEO_IDS`** so every audit hits this regression target.

## 3. Live product flows (manual / spot)

| Flow | Result | Notes |
| --- | --- | --- |
| Homepage recent searches | Not executed in CI | Device `localStorage`; verify in browser |
| `/search/ai-agents` recovery | Spot-check prod | Expansion + recovery in `search-landing-engine` / `query-expansion` |
| Save moment → `/saved` | Not executed in CI | `SaveMomentButton` + `/saved` |
| Share blocks | Not executed in CI | `ViralShareBlock` |
| `/trending` | Not executed in CI | Server page + local strip |
| Email digest (3 searches / 2 ts clicks) | Not executed in CI | `EmailDigestPrompt` + session metrics |

## 4. Analytics event names (confirmed in `lib/analytics.ts`)

`homepage_search`, `paste_url_submit`, `result_click`, `youtube_timestamp_click`, `no_results`, `search_query`, `search_result_click`, `search_zero_results`, `youtube_open`, `search_submitted`, … (existing)  

**Growth loop additions:**  
`recent_search_click`, `continue_exploring_click`, `search_depth_milestone`, `saved_clip`, `email_capture_prompt_shown`, `email_capture_submit`, `empty_search_recovered`

## 5. Remaining risks

- **Cold starts / CDN**: occasional slow TTFB can still fail strict audits; `audit:seo` is best-effort against production.  
- **First-time transcript fetch**: YouTube + cache write can be slow; inner + outer timeouts favor **degraded heavy UI** over **route 504**.  
- **Env overrides**: operators can raise `VIDEO_PAGE_*` caps; higher caps increase **504 / CPU** risk on Vercel.
