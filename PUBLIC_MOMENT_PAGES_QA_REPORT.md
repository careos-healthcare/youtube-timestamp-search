# Public moment pages — production QA (post `9b79fc1`)

## Scope

Post-deploy checks for canonical **`/moment/[id]/[slug]`** pages on **`https://www.youtubetimesearch.com`**, plus **`npm run audit:seo:quick`** against production (`AUDIT_BASE_URL=https://www.youtubetimesearch.com`).

## Repo / deploy

| Item | Value |
|------|--------|
| **Git base commit** | `9b79fc1` (canonical moment pages MVP on `main`) |
| **Local `HEAD` at QA** | `9b79fc1` (already matched `origin/main` after `git pull`) |
| **Vercel production deploy (initial)** | `dpl_HRmjQkSerqqqrtmpMzvwaaz2JpSS` — aliased to `www.youtubetimesearch.com` |
| **Follow-up deploy** | `dpl_FjRMzqhJT6f6GA82JPdLNHsDEPkN` — ASCII quote normalization in `api/og/moment-public` (OG still **500**; see below) |

## Sampled moment URLs (from `data/public-moments.json`)

1. `https://www.youtubetimesearch.com/moment/bf99c0b48b328a60c825/going`  
2. `https://www.youtubetimesearch.com/moment/889ca595599e6cc92bf2/just`  
3. `https://www.youtubetimesearch.com/moment/863984ba29c607f1f859/here`  

## Pass/fail — HTML (`curl` + `grep` on production)

Verification used **`/usr/bin/curl`** and **`/usr/bin/grep`** against `https://www.youtubetimesearch.com`.

| Check | M1 | M2 | M3 |
|--------|----|----|-----|
| HTTP 200 | PASS | PASS | PASS |
| `<title>` present | PASS | PASS | PASS |
| `meta name="description"` | PASS | PASS | PASS |
| `link rel="canonical"` | PASS | PASS | PASS |
| `application/ld+json` | PASS | PASS | PASS |
| “Save moment” in HTML | PASS | PASS | PASS |
| “Share this moment” (share panel) | PASS | PASS | PASS |
| “Related moments” section | PASS | PASS | PASS |

## YouTube timestamp links

`curl -L -o /dev/null -w "%{http_code}"` → **200** for:

- `https://www.youtube.com/watch?v=7CqJlxBYj-M`  
- `https://www.youtube.com/watch?v=7CqJlxBYj-M&t=136s`  
- `https://www.youtube.com/watch?v=-leIp449qXA&t=48s`  

## OG image status

| URL | HTTP | Notes |
|-----|------|--------|
| `/api/og/moment-public/bf99c0b48b328a60c825` | **500** | Next error HTML (`__next_error__`), not PNG |
| `/api/og/moment-public/889ca595599e6cc92bf2` | **500** | same |
| `/api/og/moment-public/863984ba29c607f1f859` | **500** | same |
| `/api/og/moment/7CqJlxBYj-M?q=going` (legacy) | **500** | same class of failure |
| `/api/og/video/7CqJlxBYj-M` | **200** | PNG (control — `OgCardShell`-less path still healthy) |

Hypothesis: **Satori / `@vercel/og`** chokes on some **`OgCardShell` + moment-style payload** (not only typographic quotes); needs Vercel runtime logs or a reduced test card to isolate. **Not** treated as a regression unique to canonical IDs — legacy moment OG is also broken in prod.

## SEO audit (`npm run audit:seo:quick`)

- **Base URL:** `https://www.youtubetimesearch.com`  
- **Result:** **13 passed**, 0 failed_http, 0 failed_html, 0 timed_out  
- **Moment URLs in quick set:** first **two** entries from local `loadPublicMoments()` (matched M1, M2). M3 was **not** in the audit list but was checked manually (table above).  
- **robots.txt:** PASS  
- **`/api/analytics/event`:** PASS (HTTP 200)  

## Remaining risks

1. **OG cards** for moment-style `OgCardShell` routes return **500** in production — social previews that depend on those URLs will **not** render the custom image until fixed.  
2. **HTML meta `og:image`** on moment pages still **points** at `/api/og/moment-public/[id]` — crawlers/social bots may record broken image URLs until OG is fixed.  
3. **Materialized JSON** must stay in sync with deploy artifacts; empty or mismatched `data/public-moments.json` on a deployment would **404** canonical moments.  
4. **Quick audit** only samples **two** public moments; expand coverage or add synthetic checks for OG if this becomes a release gate.

## Distribution readiness

| Criterion | Ready? |
|-----------|--------|
| Indexable HTML, canonical, JSON-LD, internal links | **Yes** |
| Save/share UI present in HTML | **Yes** |
| YouTube deep links | **Yes** |
| Production SEO quick audit | **Yes** (13/13) |
| Custom OG PNG for moment cards | **No** (500) |

**Verdict:** Safe to **distribute deep links** to canonical moment **pages** for SEO and UX; **not** safe to rely on **rich OG image previews** until `/api/og/moment-public/*` (and legacy `/api/og/moment/*`) are fixed in production.
