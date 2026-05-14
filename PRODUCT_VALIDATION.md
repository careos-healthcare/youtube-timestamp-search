# Product validation — video knowledge search MVP

## Target user

People who watch **long-form YouTube video** (lectures, podcasts, tutorials, interviews) and need to **find a specific moment** without scrubbing the timeline.

Typical jobs:

- “Where did they explain X?”
- “Find the quote about Y in this 3-hour episode.”
- “Jump to the section on Z in this course video.”

Not targeting: creators managing channels, social feeds, or clip editors.

## Core promise

**Search inside video the way Google searches webpages.**

**Wedge:** Find exact useful moments inside long-form YouTube videos.

The MVP delivers value when a user can:

1. Paste a public YouTube URL with captions.
2. Search a phrase inside that video’s transcript.
3. Open the **exact timestamp** on YouTube in one click.

## Top 5 test queries

Run these manually against production (`https://www.youtubetimesearch.com`).

| # | Flow | URL / action | Phrase | Expected |
|---|------|----------------|--------|----------|
| 1 | Homepage search | `https://www.youtube.com/watch?v=PkZNo7MFNFg` (freeCodeCamp JS) | `javascript` | ≥1 result; “Open at this moment” opens YouTube near the intro |
| 2 | Homepage search | `https://www.youtube.com/watch?v=aircAruvnKk` (3Blue1Brown NN) | `gradient` | ≥1 result with valid `t=` timestamp |
| 3 | Indexed video page | Open `/video/PkZNo7MFNFg` → search within video | `function` | Navigates to moment page with matches |
| 4 | No results | Same demo video | `xyznonexistentphrase123` | Empty state; `no_results` analytics; no crash |
| 5 | Index search | `/transcripts` → search cached index | common topic from indexed corpus | Results or empty state: “We have not indexed that yet…” |

## Pass / fail criteria

### Pass (MVP ready for real users)

- [ ] Homepage loads in &lt;3s on mobile and desktop.
- [ ] Homepage → search → moment page completes without error for a known captioned video.
- [ ] At least one result shows timestamp + snippet + **Open at this moment** link with correct `t=` param.
- [ ] Video page loads transcript preview and **Search within this video** works.
- [ ] Empty index search shows: *We have not indexed that yet. Paste a YouTube URL to search inside it.*
- [ ] No-results phrase search shows helpful copy (no blank screen).
- [ ] Feedback CTA (“Did this find the right moment? Yes / No”) appears when results exist.
- [ ] Analytics events fire: `homepage_search`, `paste_url_submit`, `result_click`, `youtube_timestamp_click`, `no_results`.
- [ ] `npm run lint` and `npm run build` pass.

### Fail (block launch)

- Transcript fetch fails for majority of test videos with public captions.
- Timestamp links open YouTube at 0:00 consistently (broken deep links).
- Moment page errors (5xx) for valid video IDs.
- No empty state on zero index results.
- Core search path requires sign-up or shows creator/social UI prominently.

## Launch checklist

### Product

- [ ] Homepage hero matches video-knowledge positioning (`lib/product-copy.ts`).
- [ ] Primary CTA is **Search inside video** (not creator browse).
- [ ] Empty states use `lib/empty-state-copy.ts`.
- [ ] Result feedback CTA shipped on moment results.

### Technical

- [ ] Vercel Analytics receiving custom events (`lib/analytics.ts`).
- [ ] Supabase transcript cache configured in production (if persistence required).
- [ ] Rate limits acceptable under light launch traffic (`/api/transcript`).
- [ ] Error messages human-readable (invalid URL, no captions, rate limit).

### Validation (live audit — 2026-05-14)

| Check | Status | Notes |
|-------|--------|-------|
| Homepage HTTP 200 | **Pass** | `GET /` → 200 |
| Transcript API | **Pass** | `POST /api/transcript` returns `PkZNo7MFNFg` transcript |
| Moment page | **Pass** | `/video/PkZNo7MFNFg/moment/javascript` → 200 |
| Video landing | **Pass** | `/video/PkZNo7MFNFg` → 200 |
| Transcript index | **Pass** | `/transcripts` → 200 |
| Analytics events | **Shipped** | Requires deploy + Vercel dashboard verify |
| Feedback CTA | **Shipped** | Requires deploy |
| Empty-state copy | **Shipped** | Requires deploy |

### Post-launch (week 1)

- [ ] Review `no_results` rate vs `homepage_search` in analytics.
- [ ] Review feedback Yes/No ratio (manual until feedback analytics added).
- [ ] Expand indexed corpus via seed batches (programming + AI priority).
- [ ] Re-run top 5 queries after each deploy.

## Blockers

| Blocker | Severity | Mitigation |
|---------|----------|------------|
| YouTube caption / rate limits | Medium | Cache transcripts; show clear retry copy |
| Small public index | Low | Paste-URL flow works without pre-index |
| Creator/topic SEO pages still in sitemap | Low | De-emphasized in UI; not blocking core loop |
| Feedback not persisted server-side | Low | UI-only for MVP; add API later if needed |
