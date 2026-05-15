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

- **`/trending`** and **`/saved`** live under the App Router route group **`app/(discovery)/…`** with **`dynamic = "force-dynamic"`** so production always resolves the server route (avoids stale static 404 edge cases on some hosts).
- After deploy, smoke with `npm run audit:seo:quick` and `curl -I https://www.youtubetimesearch.com/trending`.
