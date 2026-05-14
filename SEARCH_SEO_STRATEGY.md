# Search SEO strategy — Phase 2

## Positioning

**Product:** Public searchable video knowledge engine  
**Tagline:** Search inside video the way Google searches webpages.  
**Wedge:** Find exact useful moments inside long-form YouTube videos.

SEO goal: capture **long-tail spoken queries** (questions, how-tos, topic phrases) and route them to **timestamped video moments** — not creator profiles or social feeds.

---

## Long-tail keyword strategy

### Tier 1 — High intent (build first)

Question + topic phrases people speak aloud:

- `what is rag`
- `how to learn python`
- `ai agents`
- `prompt engineering`
- `system design interview`

**Page type:** `/search/[slug]` with aggregated indexed moments + FAQ schema.

### Tier 2 — Topic clusters

Programming, AI, business, productivity phrases from `lib/search-query-seeds.ts` and `lib/topic-seeds.ts`:

- `machine learning`, `react hooks`, `deep work`, `startup advice`

**Page type:** Same search landing template; cross-link to categories and video pages.

### Tier 3 — Video-specific head terms

Each indexed `/video/[videoId]` page targets:

- `[video title] transcript`
- `search inside [video title]`
- `[topic] in [video title]`

**Page type:** Video landing with transcript sections, searchable moments, FAQ + VideoObject schema.

### What we do NOT optimize for

- Creator name vanity pages as primary product
- Social/share virality keywords
- Generic “YouTube downloader” terms

---

## Indexing strategy

### Crawl surfaces

| Surface | Route | Priority |
|---------|-------|----------|
| Homepage | `/` | 1.0 |
| Video index | `/transcripts` | 0.9 |
| Query landings | `/search/*` | 0.88 (daily) |
| Video pages | `/video/[id]` | 0.82 |
| Categories | `/category/*` | 0.85 |
| Topics (legacy SEO) | `/topic/*` | 0.7 |

### Static generation

- **30 priority queries** pre-rendered at build via `generateStaticParams` on `/search/[query]`.
- `dynamicParams = true` allows long-tail slugs at runtime.
- `revalidate = 300` refreshes moment aggregates as index grows.

### Sitemap

`app/sitemap.ts` emits:

- Static pages
- All priority `/search/` routes
- Up to **2,000** indexed `/video/` URLs from Supabase/cache
- Categories + topics + creators (creators deprioritized in UI, kept for crawl)

### Transcript-derived index

- `searchCachedTranscripts()` powers query landing aggregation.
- Transcripts cached on first successful user search or seed pipeline.
- Supabase `transcripts` + `transcript_segments` tables are source of truth in production.

---

## Internal linking strategy

### Video → search

- **Key discussed topics** chips → moment search + `/search/[phrase]` links
- **Searchable moments** → `/video/[id]/moment/[query]`
- **Related searches** → moment paths + global search routes

### Search → video

- Aggregated results link to **video pages** and **YouTube timestamps**
- **Related indexed videos** list per query
- **Related searches** phrase cluster at page bottom

### Phrase → phrase

- `lib/internal-linking.ts` token overlap across `PRIORITY_SEARCH_QUERIES` + topic seeds
- Increases crawl depth between query landings

### Authority flywheel

```
Seed / user indexes video
    → /video/[id] gains transcript sections + schema
    → Topics link to /search/[phrase]
    → Search pages aggregate moments across videos
    → Moments link back to videos + YouTube
    → More indexing → richer search landings → more long-tail rankings
```

---

## Example target queries (first 90 days)

| Query | Why it ranks |
|-------|----------------|
| `what is rag` | High AI search volume, few timestamp-native results |
| `how to learn python` | Evergreen tutorial intent |
| `ai agents` | Trending spoken query |
| `javascript tutorial` | Matches seeded freeCodeCamp corpus |
| `deep work` | Podcast/lecture clip intent |
| `system design` | Long interview/tutorial moments |
| `prompt engineering` | AI education long-tail |
| `machine learning` | Broad with indexed lecture matches |

---

## Pages most likely to rank first

1. **`/search/javascript`** — strong seeded programming corpus  
2. **`/search/what-is-rag`** — specific question format + FAQ schema  
3. **`/search/how-to-learn-python`** — classic how-to modifier  
4. **`/video/PkZNo7MFNFg`** — popular indexed tutorial (if seeded)  
5. **`/transcripts`** — index hub with internal links to all videos  
6. **`/category/programming-tutorials`** — category hub for tutorial intent  

---

## Schema markup

| Page | Schema |
|------|--------|
| Video | `WebPage`, `VideoObject`, `BreadcrumbList`, `FAQPage` |
| Search query | `WebPage`, `BreadcrumbList`, `FAQPage`, `ItemList` |
| Moment | Web metadata via `createMomentMetadata` |

---

## Analytics (Phase 2)

Persistent events (Vercel + optional Supabase `search_analytics_events`):

- `search_query` — query + result count
- `search_result_click` — query + videoId
- `search_zero_results` — query only
- `youtube_open` — query + videoId + timestamp

Use these to prioritize which query landings to expand and which videos to seed next.

---

## Blockers

- **Corpus size** — empty search landings until videos are indexed; paste-URL flow is fallback CTA.
- **Caption coverage** — no transcript = no SEO page value.
- **Supabase migration** — run `003_search_analytics_events.sql` for persistent analytics storage.
- **Creator/topic page dilution** — large legacy SEO surface; keep de-emphasized in UI while retaining crawl paths.
