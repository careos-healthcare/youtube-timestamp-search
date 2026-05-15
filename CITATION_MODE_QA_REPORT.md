# Citation mode — post-deploy QA

**Date:** 2026-05-15  
**Scope:** Phase 1 citation UI on canonical public moment pages (commit `bbdacf6`).

## Source control

| Step | Result |
|------|--------|
| `git pull origin main` | Already up to date |
| `git rev-parse --short HEAD` | `bbdacf6` |

## Deploy (`vercel --prod`)

| Field | Value |
|-------|--------|
| CLI | `vercel --prod --yes` from repo root |
| Status | **READY** (build + assign succeeded) |
| Deployment URL | `https://youtube-timestamp-search-39xxz10ya.vercel.app` |
| Inspector | `https://vercel.com/invoicessutton-3920s-projects/youtube-timestamp-search/88jexvPCGC6ewzq6gokRdCjanUfj` |
| Notes | Custom domain checks below target **`https://www.youtubetimesearch.com`** (same base URL as `npm run audit:seo:quick`). GitHub → Vercel production for that host is assumed aligned with `main`; HTML checks were run against the live custom domain. |

## Sampled canonical URLs

Picked from `data/public-moments.json` (first three entries):

1. `https://www.youtubetimesearch.com/moment/5010f283a48bf81aa2ed/database`
2. `https://www.youtubetimesearch.com/moment/e694fd85beb06e10ca2e/kubernetes`
3. `https://www.youtubetimesearch.com/moment/6c6ff7083ac50806da9a/database-7`

## Pass / fail matrix

| Check | URL 1 | URL 2 | URL 3 |
|------|:-----:|:-----:|:-----:|
| HTTP 200 | PASS | PASS | PASS |
| `#cite-this-moment` + “Cite this moment” heading | PASS | PASS | PASS |
| Format labels (Markdown, Plain text, Academic-style, HTML embed) | PASS | PASS | PASS |
| Four citation **Copy** controls inside citation `<section>` (HTML slice `cite-this-moment` → share grid) | PASS | PASS | PASS |
| Markdown body fingerprint (`&gt;` blockquote / `**Retrieved:**`) | PASS | PASS | PASS |
| Plain text fingerprint (`Title:`, `Retrieved:`) | PASS | PASS | PASS |
| Academic fingerprint (`In *`, `Accessed`, canonical + YouTube URLs) | PASS | PASS | PASS |
| HTML embed fingerprint (`/embed/moment?`, `iframe`) | PASS | PASS | PASS |
| “Open on YouTube at timestamp” `href` **matches** `youtubeUrl` in `public-moments.json` (after `&amp;` → `&`) | PASS | PASS | PASS |
| `application/ld+json` present | PASS | PASS | PASS |
| `"@type":"WebPage"` in JSON-LD | PASS | PASS | PASS |
| `Quotation` in JSON-LD | PASS | PASS | PASS |
| `/api/og/moment-public/{id}` → HTTP 200, PNG | PASS | PASS | PASS |
| `npm run audit:seo:quick` | **PASS** (15 pages, 0 failures; includes all three moment URLs + OG PNG checks) | | |

### Clipboard “copy works”

| Check | Result |
|-------|--------|
| Markdown / plain / academic / embed copy | **PASS (structural)** — each format has a dedicated **Copy** `<button>` adjacent to labeled `<pre>` text containing the expected payload shape. |
| End-to-end `navigator.clipboard` | **Not automated** — requires a secure browser context and a user gesture; recommend a one-time manual click on each **Copy** in production if you need absolute clipboard confirmation. |

### YouTube timestamp click

| Check | Result |
|-------|--------|
| Citation CTA `href` vs materialized `youtubeUrl` in `data/public-moments.json` | **PASS** — exact string match for all three URLs (decoded entity `&amp;` → `&`). Opening the link in a browser was not automated here. |

## Citation formats verified (production HTML)

- **Markdown** — blockquote line, bold title · channel · `` `timestamp` ``, bullets for canonical + YouTube + retrieved date.
- **Plain text** — quoted snippet, labeled lines including `Title:`, `Channel:`, `Timestamp:`, `Phrase:`, canonical + YouTube lines, `Retrieved:`.
- **Academic-style** — single-line prose with italicized video title marker `In *…*`, timestamp, both URLs, `Accessed …`.
- **HTML embed** — escaped `<iframe …>` pointing at on-site `/embed/moment?…` with `videoId`, `q`, `t`, `snippet`, optional `channel`.

## `npm run audit:seo:quick`

- **Exit code:** 0  
- **Summary:** 15 passed, 0 failed_http, 0 failed_html, 0 timed_out  
- **Moment + OG checks:** all three sampled moment pages PASS; moment-public OG routes return `image/png`.

## Remaining risks

1. **Clipboard** — Structural DOM checks only; no headless assertion that the OS clipboard receives bytes.
2. **Deploy surface** — `vercel --prod` from this workspace targeted the CLI-linked Vercel project; the **custom domain** may track a different Git integration—operators should confirm `www.youtubetimesearch.com` is pinned to the same `main` commit for regulated releases.
3. **YouTube playback** — `href` matches stored materialized URLs; actual seek behavior remains YouTube’s responsibility if URLs or indexing drift.
4. **HTML shape** — Checks depend on current RSC/HTML serialization (e.g. section order, `&amp;` encoding); brittle if layout markup changes without updating QA.
