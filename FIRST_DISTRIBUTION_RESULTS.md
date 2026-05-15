# First distribution — results log (48-hour window)

**Window:** start when you begin posting; review **48 hours** after the last post.  
**Rule:** optimize for **saves, shares, citation copies, and return depth** — not raw impressions. A Reddit spike with zero downstream signals is a weak outcome.

This document is a **live log**: fill posting rows when you publish; fill metrics after the window. Automated agents here cannot post to X, Reddit, HN, Discord, or Slack on your behalf.

---

## 1. Export (source of truth for links)

Run whenever you refresh the corpus or want a new pick list:

```bash
npm run distribution:export-links -- --count=5
```

Implementation: `scripts/distribution-export-links.ts` — same UTM contract as `buildTrackedPublicMomentPageUrl` (`utm_campaign=moment`, `utm_content=<momentId>`).

**Do not** hand-edit UTMs in posts; always copy from the script output for the **target platform** (`utm_source=twitter` | `reddit` | `hackernews`).

---

## 2. Analytics you asked for vs what the app actually emits

| You asked | In codebase | How to read it |
|-----------|----------------|----------------|
| `topic_page_view` | Yes | Fires on `/topic/[slug]` loads. Filter by payload in Vercel or Supabase. |
| `canonical_moment_page_view` | Yes | Client `trackEvent` on canonical moment pages (not sent via `sendBeacon` to `/api/analytics/event`). Prefer **Vercel Analytics** for counts. |
| `moment_share_click` | **No** | Use **`link_copy`** with `surface: "viral_share_block"` and `label` (`x`, `reddit`, `markdown_citation`, …) when users copy share-format buttons on the moment page. |
| `moment_save_click` | **No** | Use **`saved_clip`** (`trackPersistentEvent`) with `query` + `videoId` when someone saves from the moment page. |
| `moment_citation_copy` | Yes | Citation panel copies (Markdown / plain / academic). |
| `moment_embed_copy` | Yes | Citation HTML embed copy. |
| `moment_youtube_citation_click` | Yes | “Open on YouTube at timestamp” in citation block. |
| Session depth | Partial | **`search_depth_milestone`** applies to search flows. For moment landings, use Vercel **pages per visit** / path sequences after `/moment/...`. |
| Return visits | Not a named event | Vercel **returning visitors** or future session instrumentation. |

**Supabase (when configured):** `POST /api/analytics/event` inserts `search_analytics_events` for **persistent** client events (`trackPersistentEvent`). Events that only call `trackEvent` may appear in Vercel but **not** in that table.

---

## 3. Curated batch (from `npm run distribution:export-links -- --count=5`)

Use **one** tracked URL per post matching the platform. Below lists **Twitter** variants; run the export for **Reddit** / **Hacker News** lines per moment.

| # | Moment (phrase) | Video | Topic hub (optional) |
|---|-----------------|-------|----------------------|
| 1 | **anthropic** | Dylan Patel — The single biggest bottleneck to scaling AI compute (Dwarkesh Patel) | `https://www.youtubetimesearch.com/topic/dylan-patel-compute` |
| 2 | **Docker container and how to create different containers** | Kubernetes Course - Full Beginners Tutorial (freeCodeCamp) | — |
| 3 | **OpenAI training intentions** (long slug) | State of AI in 2026… (Lex Fridman #490) | — |
| 4 | **pre-training and what is posttraining** | DeepSeek, China, OpenAI, NVIDIA… (Lex Fridman #459) | — |
| 5 | **internal model / inference** (long slug) | Adam Marblestone – AI is missing something fundamental about the brain (Dwarkesh Patel) | — |

### Tracked URLs (Twitter / `utm_source=twitter`)

Use these verbatim on **X**:

1. `https://www.youtubetimesearch.com/moment/f4ecb88fe4de2a7ee4cc/anthropic?utm_source=twitter&utm_medium=social&utm_campaign=moment&utm_content=f4ecb88fe4de2a7ee4cc`
2. `https://www.youtubetimesearch.com/moment/6d912c21306211de4523/docker-container-and-how-to-create-different-containers?utm_source=twitter&utm_medium=social&utm_campaign=moment&utm_content=6d912c21306211de4523`
3. `https://www.youtubetimesearch.com/moment/225a6bc5b10e893a1523/a-failure-of-openai's-training%E2%80%94where-they-have-the-intentions-and-they-haven't-met-them-yet%E2%80%94-versus-what-is-something-th?utm_source=twitter&utm_medium=social&utm_campaign=moment&utm_content=225a6bc5b10e893a1523`
4. `https://www.youtubetimesearch.com/moment/25120b4c8094215e6a4d/pre-training-and-what-is-posttraining?utm_source=twitter&utm_medium=social&utm_campaign=moment&utm_content=25120b4c8094215e6a4d`
5. `https://www.youtubetimesearch.com/moment/4c663ae9032ccb4a39ed/i-update-my%E2%80%A6-what-are-the-missing-variables-in-my-internal-model?utm_source=twitter&utm_medium=social&utm_campaign=moment&utm_content=4c663ae9032ccb4a39ed`

For **Reddit** / **Hacker News**, copy from the export output under **Tracked — Reddit** / **Tracked — Hacker News**.

---

## 4. Posting plan (manual — owner checklist)

| Platform | Suggested targets | Notes |
|----------|-------------------|-------|
| **X** | Your feed; replies in AI/ML/K8s discussions | One moment per thread; lead with why the timestamp matters. |
| **Reddit** | `r/kubernetes`, `r/MachineLearning`, `r/programming`, `r/LocalLLaMA` (only if on-topic) | Comment-first; avoid drive-by link posts. |
| **Hacker News** | Only when a Show HN or thread genuinely fits | Prefer one strong comment; skip low-value link dumping. |
| **Discord / Slack** | `#ai`, `#platform`, or mod-approved channels | Ask mods first; same tracked URL discipline. |

**Framing:** “Exact line in a long interview/course — opens on YouTube at the timestamp; transcript excerpt on the landing page.”

---

## 5. Posting log (fill when you publish)

| Moment # | Platform | Community / URL | Post or comment link | Tracked URL variant used | Posted (UTC) |
|----------|----------|-----------------|----------------------|---------------------------|--------------|
| | | | | | |
| | | | | | |

---

## 6. Metrics (fill after 48h)

### 6.1 Platform-native (impressions / votes / comments)

| Post | Impressions / views | Upvotes | Comments | Saves (platform) | Notes |
|------|---------------------|---------|----------|-------------------|-------|
| | | | | | |

### 6.2 Product analytics (approximate counts for the window)

| Signal | Count | Notes |
|--------|-------|-------|
| `canonical_moment_page_view` (Vercel) | | Paths under `/moment/...`. |
| `topic_page_view` | | e.g. `dylan-patel-compute` if you promote the topic hub. |
| `saved_clip` | | Proxy for saves from moment pages. |
| `link_copy` (`surface: viral_share_block`) | | Proxy for share-format copies. |
| `moment_citation_copy` | | |
| `moment_embed_copy` | | |
| `moment_youtube_citation_click` | | |
| Onward navigation / depth | | Vercel funnels or `search_depth_milestone` if users hit search. |

### 6.3 Quality bar

| Criterion | Pass / fail | Evidence |
|-----------|-------------|----------|
| Citations/embeds without only vanity traffic | | |
| `saved_clip` from cohort | | |
| Small thread + returns / second page | | |
| Big Reddit spike, zero saves and zero citations | | Flag as **weak** if true. |

---

## 7. Which topics / moments performed best

| Rank | Moment | Why it worked (hypothesis) |
|------|--------|----------------------------|
| | | |

---

## 8. Posts that failed completely

| Post | What happened | Hypothesis |
|------|-----------------|------------|
| | | |

---

## 9. Qualitative reactions

Paste notable comments (anonymized if needed), mod removals, or silent threads.

---

## 10. Hypotheses for the next loop

- 
- 

---

## 11. Next actions (no new features unless a pattern repeats)

- [ ] Re-run `distribution:export-links` after index/materialization changes.
- [ ] If posts get views but **zero** `moment_citation_copy` and **zero** `saved_clip` repeatedly, treat that as a distribution/copy problem first; only then consider small product fixes.
