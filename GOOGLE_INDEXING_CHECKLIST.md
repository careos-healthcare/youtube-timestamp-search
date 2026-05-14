# Google Search Console — indexing checklist

Use this after deploying Phase 2/3 to production (`https://www.youtubetimesearch.com`).

## Prerequisites

- [ ] Production deploy is live
- [ ] `npm run audit:seo` passes (or failures documented)
- [ ] Supabase migration `003_search_analytics_events.sql` applied (`supabase db push`)
- [ ] Property verified in [Google Search Console](https://search.google.com/search-console)

## 1. Submit sitemap

1. Open **Sitemaps** in Search Console.
2. Submit: `https://www.youtubetimesearch.com/sitemap.xml`
3. Confirm status **Success** within 24–48 hours.

Optional moment experiment (only if `SITEMAP_INCLUDE_MOMENTS=true`):

- Moment URLs are included in the main sitemap when enabled.
- Cap: 1,000 moment URLs, top 3 keywords per indexed video.

## 2. URL inspection — core pages

Inspect each URL → **Test live URL** → **Request indexing** if eligible.

| Page | URL |
|------|-----|
| Homepage | `https://www.youtubetimesearch.com/` |
| Video index | `https://www.youtubetimesearch.com/transcripts` |

## 3. URL inspection — 5 search landing pages

| Query | URL |
|-------|-----|
| what is rag | `https://www.youtubetimesearch.com/search/what-is-rag` |
| how to learn python | `https://www.youtubetimesearch.com/search/how-to-learn-python` |
| ai agents | `https://www.youtubetimesearch.com/search/ai-agents` |
| javascript | `https://www.youtubetimesearch.com/search/javascript` |
| machine learning | `https://www.youtubetimesearch.com/search/machine-learning` |

## 4. URL inspection — 5 video pages

Pick 5 indexed videos from `/transcripts` or `INDEX_QUALITY_REPORT.md` top results.

Example format: `https://www.youtubetimesearch.com/video/<VIDEO_ID>`

## 5. robots.txt verification

Confirm in browser: `https://www.youtubetimesearch.com/robots.txt`

- [ ] `Sitemap:` line present
- [ ] `/search/`, `/video/`, `/transcripts` allowed (or `/` allow-all)
- [ ] `/api/` disallowed

## 6. Weekly monitoring (first 4 weeks)

Every Monday, review Search Console:

| Metric | Action |
|--------|--------|
| **Impressions** | Growing on `/search/*` and `/video/*` |
| **Clicks** | CTR > 1% on query landings is a good early signal |
| **Indexed pages** | Compare to sitemap URL count in `INDEX_QUALITY_REPORT.md` |
| **Crawl errors** | Fix 4xx/5xx within 24h |
| **Core Web Vitals** | No regression on homepage + search pages |

## 7. Analytics persistence check

```bash
curl -sS -X POST https://www.youtubetimesearch.com/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"event":"search_query","query":"gsc-check","videoId":"probe"}'
```

Expected: `{"ok":true}`

Verify row in Supabase `search_analytics_events` (after migration).

## 8. When to request re-indexing

- After seeding 50+ new videos
- After expanding priority `/search/*` slugs
- After enabling moment sitemap experiment
- After fixing audit failures from `npm run audit:seo`
