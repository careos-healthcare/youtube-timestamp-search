# Post–growth-loop production QA

**Repo:** `youtube-timestamp-search`  
**Verified HEAD (after `git pull origin main`):** `c429d85` (`c429d852…` — *Stabilize growth loop production QA*; matches `origin/main` at verification time)  
**Previous report baseline:** `7d85621` (growth loop merge)

## 0. Post-deploy verification (production `www`, commit `c429d85` or newer)

**Deploy commit checked:** `c429d85` (local + `git ls-remote origin refs/heads/main`).

| Check | Result |
| --- | --- |
| `npm run lint` | **Pass** |
| `npm run validate:query-expansion` | **Pass** |
| `npm run build` | **Not clean on this machine** | With an **untracked** `pages/_app.tsx` present, `next build` (Turbopack) failed prerendering `/404` (`PageNotFoundError`: cannot find module for page `/_document`). A clean clone without that folder should match CI/Vercel unless the same `pages/` partial exists in the deploy context. |
| `npm run audit:seo` | **Harness updated** | Prior red audits were often **client fetch timeouts** on slow `/video/*` HTML (not confirmed app **504** until you see **HTTP 502/504** in the audit’s **FAIL_HTTP** line or via `curl -w '%{http_code}'`). Full audit still hits every priority slug and a video sample; expect long runtime. |
| `npm run audit:seo:quick` | **Smoke subset** | Audits homepage, `/transcripts`, **STATIC_BUILD_SEARCH_SLUGS** search pages, `/trending`, `/saved`, and the **two priority** video IDs only—use after deploy or in tight loops. |

**Risky production URLs (`curl`, `--max-time` 90s, host `https://www.youtubetimesearch.com`):**

| Path | HTTP | Latency (approx.) | Title / canonical / JSON-LD | Notes |
| --- | --- | --- | --- | --- |
| `/video/gh2_PhgZGsM` | **200** | ~7.8s | Present | No 502/504 observed. |
| `/video/7CqJlxBYj-M` | **200** | ~6.5s | Present | No 502/504 observed. |
| `/search/ai-agents` | **200** | ~0.15s | Present | — |
| `/search/system-design` | **200** | ~0.15s | Present | — |
| `/trending` | **404** | ~0.06s | N/A (Next default **404** shell + `noindex`) | Response matches **`/_not-found`** RSC tree, not the `app/trending/page.tsx` shell. `origin/main` **does** include `app/trending/page.tsx` at `c429d85` — treat as **deployment / build artifact mismatch** until Vercel serves the route (e.g. redeploy **without build cache**, confirm repo + production branch). |
| `/saved` | **404** | ~0.06s | N/A | Same as `/trending`; source has `app/saved/page.tsx` with `robots: noindex` — prod must **render 200**, not 404. |

**Apex redirect:** `https://youtubetimesearch.com/trending` → **307** → `https://www.youtubetimesearch.com/trending` → **404** (same for `/saved`).

**Diagnostics**

- `GET /api/video-runtime-diagnostics` → **200**, body `{"latest":null,"recent":[]}` (empty diagnostics payload; endpoint healthy).
- `GET /api/search-index?q=ai-agents` → **200**, `resultCount: 0`, `degraded: false` (index/data empty for this slug; not an HTTP failure).

**504 issue (video heavy path):** On this verification pass, **no HTTP 502/504** on the two priority video URLs above; latencies were single-digit seconds. Prior stabilization (transcript caps, inner fetch budget, audit retries) remains the mitigation story.

**Remaining failures:** **`/trending` and `/saved` return 404 on production** while present in `main` at `c429d85`. No code change applied in this pass (needs Vercel/production investigation first).

**Growth-loop stability commit:** **Not created** — checklist not all green (see `/trending`, `/saved`).

## 1. Automated checks (local, post-patch)

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | **Pass** | Re-verified with `main` at `c429d85`. |
| `npm run build` | **See §0** | Clean clone: expect **Pass** (Vercel). This workspace had an **untracked** `pages/_app.tsx` (Pages Router stub) that triggered a **`/_document` prerender error**; remove or complete that `pages/` tree before relying on local `next build`. |
| `npm run validate:query-expansion` | **Pass** | Re-verified. |
| `npm run audit:seo` | **Full production crawl** | Uses **30s** deadline on non-video pages and **75s** per attempt on `/video/*`, with **HTTP retries** on **502/503/504/429** and **extra timeout retries** on videos. Summary lines: **passed**, **failed_http**, **failed_html**, **timed_out**—**TIMEOUT** is not treated as missing title/meta; **FAIL_HTML** only applies when **HTTP 200** HTML was fetched. Script exits **1** on HTTP/HTML SEO failures (and robots/analytics checks), not on **timed_out** alone. |
| `npm run audit:seo:quick` | **Fast smoke** | Same harness; URLs are homepage, `/transcripts`, `STATIC_BUILD_SEARCH_SLUGS` searches, `/trending`, `/saved`, and the two priority `/video/*` routes. Does **not** regenerate `INDEX_QUALITY_REPORT.md` (full `audit:seo` still does, after local metrics). |

**Production spot-check (curl):** See **§0** table; `GET …/video/gh2_PhgZGsM` remains **HTTP 200** with title, canonical, and JSON-LD.

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
| Save moment → `/saved` | **Prod 404 (May 2026)** | `SaveMomentButton` + `/saved` — `www` returns Next **404**; fix deployment before re-testing saves UX. |
| Share blocks | Not executed in CI | `ViralShareBlock` |
| `/trending` | **Prod 404 (May 2026)** | Server page exists in repo; `www` returns Next **404** — see **§0**. |
| Email digest (3 searches / 2 ts clicks) | Not executed in CI | `EmailDigestPrompt` + session metrics |

## 4. Analytics event names (confirmed in `lib/analytics.ts`)

`homepage_search`, `paste_url_submit`, `result_click`, `youtube_timestamp_click`, `no_results`, `search_query`, `search_result_click`, `search_zero_results`, `youtube_open`, `search_submitted`, … (existing)  

**Growth loop additions:**  
`recent_search_click`, `continue_exploring_click`, `search_depth_milestone`, `saved_clip`, `email_capture_prompt_shown`, `email_capture_submit`, `empty_search_recovered`

## 5. Remaining risks

- **Cold starts / CDN**: slow `/video/*` HTML can still log **TIMEOUT** in `npm run audit:seo` / `audit:seo:quick`—treat as latency signal; use **FAIL_HTTP** (true **502/504**) and **`curl`** to confirm origin errors. Prefer **`npm run audit:seo:quick`** for post-deploy smoke; full **`npm run audit:seo`** remains best-effort and long-running.  
- **First-time transcript fetch**: YouTube + cache write can be slow; inner + outer timeouts favor **degraded heavy UI** over **route 504**.  
- **Env overrides**: operators can raise `VIDEO_PAGE_*` caps; higher caps increase **504 / CPU** risk on Vercel.  
- **Production vs `main` route parity**: `/trending` and `/saved` **404 on `www`** while present in `app/` at `c429d85` — prioritize Vercel **redeploy without build cache** and confirm the connected Git repo/branch before further app changes.
