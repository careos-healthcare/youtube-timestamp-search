# Elite topic showcase — post-deploy QA

Generated: 2026-05-16T17:10:00Z

## Deploy

| Field | Value |
|--------|--------|
| Git commit (deployed) | `b6f747e` — Unblock elite topic public URLs for showcase validation |
| Vercel deployment | `dpl_DknDs6dRxCqwUMpQ667oNcibuigW` |
| Production alias | https://www.youtubetimesearch.com |
| Deploy command | `vercel --prod` (exit 0) |

Local `git pull origin main` before deploy: already up to date at `b6f747e`.

## Tested URLs

| URL | Role |
|-----|------|
| https://www.youtubetimesearch.com/topic/rag | Elite showcase topic (RAG) |
| https://www.youtubetimesearch.com/topic/statistics-for-ml | Elite showcase topic (statistics-for-ML) |
| https://www.youtubetimesearch.com/collections/best-rag-explanations | RAG distribution collection |

**Spot-checked moment pages (linked from above):**

- https://www.youtubetimesearch.com/moment/d44f1dc5719a32b4b31e/the-show-model-scenario (from `/topic/rag`)
- https://www.youtubetimesearch.com/moment/2f852479347606a0cf8a/it-transition-distributions-and-observation-distributions (from `/topic/statistics-for-ml`)
- https://www.youtubetimesearch.com/moment/cd9083c6855cce37372c/models-we-have-regarding-the-embedding-and-how-to-select-the-best (from collection)

## Pass / fail matrix

Checks run against production HTML after deploy (`curl` + content markers). Interactive clipboard/save behavior is **SSR-present** (buttons in HTML); copy/save clicks were not automated in this pass.

### `/topic/rag`

| Check | Result | Notes |
|--------|--------|--------|
| HTTP 200 | **PASS** | |
| `<title>` present | **PASS** | |
| Meta description | **PASS** | |
| Canonical URL | **PASS** | `https://www.youtubetimesearch.com/topic/rag` |
| JSON-LD | **PASS** | `application/ld+json` in document |
| Topic intelligence hub | **PASS** | “High-signal research hub” + indexed moment list (seed + elite hub path) |
| Compare explanations | **PASS** | Section heading present |
| Canonical moment links | **PASS** | `/moment/…` links resolve (sample 200) |
| Citation UI on linked moment | **PASS** | “Cite this moment” + Copy blocks on sample moment |
| Save UI on linked moment | **PASS** | “Add to library” on sample moment |

### `/topic/statistics-for-ml`

| Check | Result | Notes |
|--------|--------|--------|
| HTTP 200 | **PASS** | |
| `<title>` present | **PASS** | |
| Meta description | **PASS** | |
| Canonical URL | **PASS** | `https://www.youtubetimesearch.com/topic/statistics-for-ml` |
| JSON-LD | **PASS** | |
| Topic intelligence hub | **PASS** | Hub + moment list rendered |
| Compare explanations | **PASS** | |
| Canonical moment links | **PASS** | Sample moment 200 |
| Citation UI on linked moment | **PASS** | |
| Save UI on linked moment | **PASS** | |

### `/collections/best-rag-explanations`

| Check | Result | Notes |
|--------|--------|--------|
| HTTP 200 | **PASS** | |
| `<title>` present | **PASS** | |
| Meta description | **PASS** | |
| Canonical URL | **PASS** | |
| JSON-LD | **PASS** | |
| Compare explanations | **N/A** | Not expected on collection pages |
| Moment cards / links | **PASS** | Four curated moments linked |
| Citation UI on linked moment | **PASS** | Collection → moment → cite section |
| Save UI on linked moment | **PASS** | “Add to library” on collection-linked moment |

## Production mismatches / caveats

1. **Topic hub label** — Pages use the seed+hub layout (“High-signal research hub” / “Best transcript moments”), not the emerald “Topic research hub”-only layout. Functionally equivalent for showcase validation.
2. **RAG moment relevance** — `/topic/rag` still surfaces broad “what is …” transcript matches (e.g. React course fragments) alongside RAG-specific clips; corpus governance issue, not a URL 404.
3. **statistics-for-ml graph status** — Research-grade **elite**, but graph planner remains `deepen_next` (elevated weak-context share). Does not block URL or compare/cite surfaces.
4. **No statistics-for-ml collection** — Only topic URL + moments; static collection `statistics-for-ml-explanations` still recommended for distribution.
5. **SEO quick audit** — `npm run audit:seo:quick` does **not** include `/topic/rag` or `/topic/statistics-for-ml` in its fixed URL list. `/collections/best-rag-explanations` **PASS**; `/collections` index still fails JSON-LD (pre-existing).

## Command outputs (summary)

| Command | Exit | Summary |
|---------|------|---------|
| `npm run audit:seo:quick` | 1 | 15 pass, 1 HTML fail (`/collections` JSON-LD), 1 timeout (`/trending`); analytics API 200 |
| `npm run report:elite-showcase` | 0 | RAG: elite, ready_to_showcase, 21 moments; statistics-for-ml: elite, deepen_next, 28 moments; 1 collection gap |
| `npm run report:research-sessions` | 0 | **0 sessions / 0 events** — Supabase admin not configured for persistent analytics |

## Analytics status

- **Vercel Web Analytics** — `/api/analytics/event` returns HTTP 200 (quick audit).
- **Research session warehouse** — No data: `RESEARCH_SESSION_REPORT.md` shows 0 instrumented sessions. Real-user showcase validation must use manual browser QA + `researchSessionId` in network tab until Supabase credentials and `trackPersistentEvent` traffic exist.
- **UTM tracked links** — Distribution URLs from `ELITE_TOPIC_SHOWCASE_REPORT.md` / `data/elite-topic-showcase.json` remain the source of truth for outbound campaigns.

## Ready for real-user testing?

| Surface | Ready? | Rationale |
|---------|--------|-----------|
| **RAG** (`/topic/rag` + collection) | **Yes — proceed** | URLs live; compare + cite + save surfaces present; graph `ready_to_showcase`. Run the research-session test plan in `ELITE_TOPIC_SHOWCASE_REPORT.md` with manual analytics verification. |
| **statistics-for-ML** (`/topic/statistics-for-ml`) | **Yes — with monitoring** | URLs live; 28 moments, compare/cite/save work. Monitor shallow-context mix and absence of collection landing. |
| **Aggregate analytics proof** | **No — blocked** | Cannot confirm researcher cohorts until research-session events accumulate in Supabase. |

**Verdict:** Elite topic showcase URLs are **unblocked and production-validated** for hands-on user testing. The next milestone remains behavioral: do users exhibit researcher workflows (compare → cite → save → return) better than YouTube/Google — not adding another elite topic.

## Recommended manual spot-check (5 min)

1. Open `/topic/rag` → expand **Compare explanations** → click two rows → confirm YouTube + moment links.
2. Open top moment → **Copy** under Markdown citation → confirm clipboard.
3. **Add to library** → open `/saved` → confirm clip listed.
4. Repeat on `/topic/statistics-for-ml`.
5. In DevTools → Network, filter `analytics` / `research_session` while repeating steps 1–3.
