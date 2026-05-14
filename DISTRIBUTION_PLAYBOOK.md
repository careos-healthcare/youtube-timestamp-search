# Distribution playbook

Goal: generate real search impressions, clicks, backlinks, and user behavior signals for the public video knowledge engine.

## Product positioning (do not drift)

- Search inside video the way Google searches webpages
- Wedge: find exact useful moments inside long-form YouTube videos
- Do **not** pitch: subscriptions, AI chat, note-taking, communities, creator monetization

---

## 1. Reddit strategy

### Where to post
- Subreddits aligned with indexed corpus: `r/programming`, `r/MachineLearning`, `r/startups`, `r/productivity`, `r/YouTube`
- Niche threads asking “where in this 3-hour video did they explain X?”

### How to post
1. Run `npm run discover:queries` and pick a high-intent query with strong indexed moments
2. Open the shareable search page: `/search/{query}`
3. Use **Share this search** panel:
   - Plain-text summary (copy block)
   - Reddit post title (copy block)
   - Copyable timestamp links (YouTube deep links)
4. Post format:
   - Title from Reddit title block
   - Body: 2–3 sentences + bullet list of timestamps + canonical link
   - Never fake results; only link moments that exist on the page

### What to measure
- Referrer visits (`referrer_visit` → `reddit`) in `/admin/validation`
- `search_result_click` and `youtube_open` after Reddit spikes

---

## 2. Hacker News strategy

### Best pages to share
- High-signal search landings: `/search/what-is-rag`, `/search/system-design`, `/search/startup-advice`
- Public stats freshness page: `/stats`
- Transparent index scale builds trust on HN

### Post framing
- “Show HN: search inside long-form YouTube transcripts by phrase, jump to timestamps”
- Use HN title from share panel on search pages
- Lead with canonical URL, not URL shorteners

### Comments prep
- Explain: indexed corpus, no accounts, no AI chat overlay
- Point skeptics to `/stats` and `/transcripts`

---

## 3. Long-tail SEO strategy

### Priority surfaces
| Surface | Purpose |
|---------|---------|
| `/search/*` | Query domination (30+ priority seeds) |
| `/topic/*` | Topical authority clusters |
| `/video/*` | Entity pages with best moments |
| `/stats` | Trust + crawl freshness |

### Weekly loop
```bash
npm run refresh:index
npm run audit:seo
```
- Expand seeds from `HIGH_INTENT_QUERY_REPORT.md`
- Fix thin pages (<3 moments) with real copy, not fabricated results
- Submit sitemap in Google Search Console (`GOOGLE_INDEXING_CHECKLIST.md`)

### Crawl quality rules (shipped)
- Canonical slug normalization on `/search/*`
- `noindex` for invalid / thin non-seed queries
- Query sanitization blocks spam patterns

---

## 4. Creator outreach strategy

### Who to contact
- Educators with long lectures already in the index (programming, AI, business podcasts)
- Not a creator tool pitch — position as **search discovery** for their existing public YouTube captions

### Email / DM angle
> Your video is indexed for in-video search. People can find exact moments about [topic] here: [video page URL].

### Ask
- Link to moment page or search page from video description / blog
- Embed timestamp card (`Share this search` → embed iframe snippet)

---

## 5. Backlink strategy

### Embeddable assets (shipped)
- Search widget: `/embed/search?q=...`
- Timestamp card: `/embed/moment?videoId=...&q=...&t=...`
- iframe allowed via `Content-Security-Policy: frame-ancestors *`

### Target publishers
- Engineering blogs, course recap posts, podcast show notes, forum answers

### Tracking
- Referrer breakdown in `/admin/validation`
- Watch `google` vs `direct` vs social referrers weekly

---

## 6. Query domination strategy

### Select queries
Use `HIGH_INTENT_QUERY_REPORT.md` sections:
1. Likely high-volume
2. Low-competition long-tail
3. Question-style
4. Zero-result (index gaps to fill)

### Domination checklist per query
- [ ] `/search/{query}` has ≥3 real moments OR honest thin-state copy
- [ ] OG image renders: `/api/og/search/{slug}`
- [ ] Share panel tested (Reddit + HN snippets)
- [ ] Internal links to related topics + videos
- [ ] Added to homepage trending (analytics or seed fallback)

### Index expansion
- Seed transcripts for zero-result queries before promoting externally
- Re-run `npm run refresh:index` after each seed batch

---

## 7. Launch week checklist

| Day | Action |
|-----|--------|
| Mon | Deploy + verify `/stats`, OG routes, share panels |
| Tue | Submit / re-submit sitemap; inspect 5 search URLs in GSC |
| Wed | Post 1 HN-friendly search page + `/stats` |
| Thu | Reddit answers in 3 threads with timestamp bullets |
| Fri | Review `/admin/validation` referrers + top queries |
| Weekend | Embed outreach to 5 blogs/forums |

---

## Commands

```bash
npm run discover:queries   # mine high-intent queries
npm run refresh:index        # warm pages + moat reports
npm run audit:seo            # crawl quality audit
```

## Key URLs

- Production: `https://www.youtubetimesearch.com`
- Stats: `/stats`
- Admin validation: `/admin/validation` (requires `ADMIN_SECRET`)
- OG search image: `/api/og/search/{slug}`
- OG video image: `/api/og/video/{videoId}`
