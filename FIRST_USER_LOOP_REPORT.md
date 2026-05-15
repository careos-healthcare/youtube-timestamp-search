# First-user loop (onboarding & discovery)

**Product:** YouTube Time Search — indexed transcript search without accounts.

## Intended loop

1. **Land on homepage** — read the wedge, tap a **Start here** chip or paste a URL / type a query.
2. **Open a search page** — scan timestamped moments; use **People also search for**, **Try another angle**, or **Trending now** if results are thin or recovery-based.
3. **Save a moment** — first save shows an inline banner + CTA to **`/saved`** (local library only).
4. **Share** — use existing share blocks on search / moment pages to copy or share a link.
5. **Return** — **Recent searches**, **`/trending`**, **`/saved`**, and footer links bring people back without friction.

## Key routes

| Route | Role | Indexing |
| --- | --- | --- |
| `/` | Hero, **Start here** chips, search, recent searches, trending preview, hub CTA | Indexable |
| `/search/[query]` | Primary discovery surface; onboarding strips below results | Seed-driven + quality gates |
| `/trending` | Discovery hub: searches, creators, newest videos, topics | Indexable |
| `/saved` | Device-local saved moments | **noindex**, `follow` |
| `/video/[id]` | Deep dive on a single indexed video | Indexable |

## Analytics (lightweight)

| Event | When |
| --- | --- |
| `homepage_topic_chip_click` | User taps a **Start here** chip (`label`, `href`). |
| `first_clip_saved` | First clip saved in this browser (`query`, `videoId`). |
| `saved_page_open` | `/saved` client shell mounts. |
| `trending_page_open` | `/trending` client tracker runs once per view. |
| `search_recovery_suggestion_click` | User taps a recovery / “try another angle” search suggestion (`surface`, `target`, `href`, `query`). |

Existing events (`saved_clip`, `continue_exploring_click`, `recent_search_click`, etc.) still apply.

## Retention hypothesis

- **Zero-login saves** create a reason to return (`/saved`) without account setup.
- **Trending + chips** reduce “blank search box” paralysis on first visit.
- **Cross-links on search pages** (people also, angles, trending strip) increase **second query** rate in-session and on return.
- **First-save banner** makes the personal library legible immediately after the aha moment.

## Deploy / routing notes

- **`/trending`** and **`/saved`** are implemented at **`app/trending/page.tsx`** and **`app/saved/page.tsx`** with **`dynamic = "force-dynamic"`** so Vercel always runs the App Router handler (URLs unchanged).
- After changing routing, smoke with `npm run audit:seo:quick` and `curl -I https://www.youtubetimesearch.com/trending`.

## Post-deploy verification (commit `05c47bd` and follow-up)

**Repo HEAD checked:** `05c47bd` (`git pull origin main` — already up to date). **Same session:** routing was normalized to **`app/trending`** / **`app/saved`** (flat paths) and pushed as a small follow-up commit after this verification.

### Production `curl -I` (www)

| URL | HTTP | Notes |
| --- | --- | --- |
| `/trending` | **404** | `x-matched-path: /404`; CDN `age` high — production bundle did **not** expose this route at check time. |
| `/saved` | **404** | Same as `/trending`. |
| `/search/productivity` | **200** | `x-matched-path: /search/[query]` |
| `/search/ai-agents` | **200** | ISR metadata present |

**Homepage HTML spot-check:** Response lacked **Start here** / newer footer copy, so **`www` was behind `main`** at verification time (stale or non-deployed production), not only a path bug.

### Local / CI checks (at `05c47bd` workspace)

| Command | Result |
| --- | --- |
| `npm run lint` | **Pass** |
| `npm run build` | **Pass** (`ƒ /trending`, `ƒ /saved` in build manifest) |
| `npm run audit:seo:quick` | **Fail** — `FAIL_HTTP` on `/trending` and `/saved` only (production 404 above); other quick URLs **PASS**. |

### Follow-ups (routing / deploy only)

1. **Routing adjustment (after this verification):** pages live at **`app/trending/page.tsx`** and **`app/saved/page.tsx`** (flat paths, same behavior as before) to match typical App Router deploy output.
2. **Redeploy** Vercel production from **`main`** (confirm Git integration + production branch). Prefer **Redeploy → Clear build cache** once if routes stay missing.
3. **Re-run** `curl -I` on `/trending` and `/saved` after deploy; expect **200** and for `/saved` HTML to include `noindex` in robots meta.
4. **Re-run** `npm run audit:seo:quick` after production shows **200** for those paths.

### Remaining risk

- Until production ships the same commit as local **`main`**, onboarding links to **`/trending`** / **`/saved`** will keep hitting **404** regardless of App Router structure. Ops: align Vercel deployment with GitHub `main` and purge stale CDN responses if needed.
