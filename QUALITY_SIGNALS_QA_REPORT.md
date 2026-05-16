# Quality Signals Layer — Post-Deploy QA

**Date:** 2026-05-15  
**Deployed commit:** `b060301`  
**Production base:** `https://www.youtubetimesearch.com`

## Sampled URLs

| Surface | URL |
|--------|-----|
| Moments index | https://www.youtubetimesearch.com/moments |
| AI moment | https://www.youtubetimesearch.com/moment/f4ecb88fe4de2a7ee4cc/anthropic |
| Coding / Kubernetes moment | https://www.youtubetimesearch.com/moment/e694fd85beb06e10ca2e/kubernetes |
| Topic hub (moments) | https://www.youtubetimesearch.com/topic/kubernetes-beginners |
| Search | https://www.youtubetimesearch.com/search/what-is-rag |

## Pass / fail table

| Check | /moments | AI moment | K8s moment | topic hub | search | Notes |
|-------|----------|-----------|------------|-----------|--------|-------|
| HTTP 200 | PASS | PASS | PASS | PASS | PASS | `curl -I` |
| Quality badges (“Clip signals”) | PASS | PASS | PASS | PASS | PASS | Present in HTML |
| “Why this moment?” control | PASS | PASS | PASS | PASS | PASS | Button + analytics attrs in HTML |
| Labels do not overclaim | PASS | PASS | PASS | WARN | WARN | Full “Heuristic / not fact-checking” copy on **moment** pages; **compact** surfaces omit long disclaimer (by design) |
| Low / medium / high plausibility | PASS* | PASS* | PASS* | PASS* | PASS* | *Automated: tier UI present; manual spot-check recommended |
| Related moments | — | PASS | PASS | — | — | Section + links present on sampled moment pages |
| Save / share / citation | — | PASS | PASS | — | — | “Save moment”, “Share moment”, “Cite this moment” in HTML |
| OG (moment pages) | — | PASS | PASS | — | — | `GET /api/og/moment-public/{id}` → 200, `image/png` for both IDs |

**SEO quick audit:** `npm run audit:seo:quick` — **PASS** (15 pages, 0 failed; OG PNG checks PASS; robots + analytics PASS).

## Manual / follow-up

- **“Why this moment?”** — Verified control and copy hooks in HTML; full expand/collapse behavior is client-side; spot-check in browser if regressions are suspected.
- **Save / share / citation** — Strings and routes present; end-to-end clicks (auth, clipboard, share sheet) not exercised in this run.
- **Related moments relevance** — Structural check only; editorial relevance is subjective.

## Remaining issues

- None blocking from automated checks. Compact surfaces intentionally show shorter signal UI; consider a one-line “heuristic, not verified” hint on index/topic/search if product wants parity with moment-page disclaimer density.

## “All opinions seem equal” feedback

Partially addressed, not solved outright. The layer adds **transparent heuristics** (structure, density, opinion/filler flags, tier) and **explicit non–fact-check** framing so users can triage clips without treating every result as equally authoritative. It does **not** verify factual truth or rank by ground truth; for that you would need external verification or human editorial policy beyond this release.
