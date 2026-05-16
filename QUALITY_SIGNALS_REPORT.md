# Quality signals layer (Phase 1)

## Purpose

Help users **triage spoken transcript clips** by *kind of content* (explanation density, technical walkthrough, opinion, weak context) — **not** by factual truth. The product stance: *“This is what the excerpt looks like, heuristically, and here are caveats.”*

Implementation: `lib/quality/` + `components/moment-quality-signals.tsx`.

---

## Signal definitions (visible labels)

| Label | Meaning (heuristic) |
|-------|---------------------|
| **High-signal explanation** | Longer excerpt + explanatory cues (`because`, `for example`, …) and/or strong technical tokens. |
| **Dense explanation** | Sub-threshold for “high-signal” but still explanation-heavy. |
| **Technical content / walkthrough** | Tech lexicon hits; “walkthrough” variant when title looks like a course/tutorial. |
| **Beginner-friendly** | Title/snippet matches tutorial / beginner patterns. |
| **Evidence-forward** | Snippet mentions studies, papers, benchmarks, empirical language. |
| **Opinion / speculation** | First-person hedging or probability language (`I think`, `probably`, …). |
| **Debated / contested topic** | Argument / controversy vocabulary. |
| **Fast clip** | Early timestamp + shorter excerpt (quick aside, not a deep segment). |
| **Primary-source style** | References to specs, RFCs, official docs (weak pattern). |
| **Weak context** | Low composite tier or weak phrase↔snippet coherence. |
| **Transcript excerpt** | Fallback when no stronger label wins (never empty). |
| **Frequently engaged (local)** | Reserved: `engagementBoost` input > 0 (not wired to storage in Phase 1). |

---

## Scoring formula (summary)

**Inputs:** `phrase`, `snippet`, `videoTitle`, `channelName`, `category`, `topic`, `startSeconds`, stored `qualityScore` (materialization), optional `semanticRank` / `extractionKinds`, optional `engagementBoost`.

**Components (conceptual):**

- **Specificity** — derived from `scorePhraseQuality` (existing phrase gate logic).
- **Explanation density** — snippet length, sentence splits, explanatory connectors.
- **Evidence** — study / paper / benchmark regex hit.
- **Technical depth** — overlap with exported `TECH_BONUS` lexicon from `public-moment-quality.ts`.
- **Channel authority** — match against `CREATOR_DATABASE` + a few educator heuristics (hint only).
- **Snippet coherence** — `scoreSnippetUsefulness` + repetition / stutter heuristics.
- **Filler penalty** — disfluencies (`um`, `uh`, …), very short phrase/snippet.
- **Opinion / speculation penalty** — subtracts and surfaces label + warning.
- **Semantic boost** — extraction kinds + small rank contribution.
- **Materialization prior** — scaled stored `qualityScore` so legacy ranking still influences composite.
- **Engagement boost** — optional small add-on (default 0 server-side).

**Outputs:**

- `qualityScore` — **0–100 UI composite** (not the same number as JSON `qualityScore` on rows).
- `qualityTier` — `high` | `medium` | `low` (thresholds ~68 / 46).
- `signals[]` — up to **3** primary badges for compact UI.
- `warnings[]` — caveats (opinion, polarization, snippet issues).
- `whyThisRanks[]` — copy for “Why this moment?” expander.
- `rankingKey` — blends composite + materialization + semantic − penalties; used for **ordering** in materialization, topic hubs, related moments, `/moments` sort.

---

## Examples (high / medium / low)

| Example | Typical tier | Dominant signals |
|---------|--------------|------------------|
| Long Kubernetes course excerpt with definitions | **high** | Technical walkthrough · Dense explanation |
| Lex-style podcast monologue with hedged takes | **medium** | Opinion/speculation warning · Dense explanation |
| Single-word query + repetitive filler | **low** | Weak context · warnings |

---

## Opinion / filler demotion (not deletion)

- **Materialization** (`scripts/materialize-public-moments.ts`): pool and final uniqueness sorts use `momentQualityRankingKey` so opinion/filler **sink** relative to explanatory clips. **IDs and slugs are unchanged** — no URL churn from this layer alone.
- **Topic hubs** (`lib/topics/topic-index.ts`): `momentHubScore` now roots in `momentQualityRankingKey` so hub ordering prefers higher-signal moments.
- **Related moments** (`lib/moments/public-moment-related.ts`): final list sorted by `momentQualityRankingKey`.

---

## Known limitations

- **No fact verification** — all signals are pattern + length + lexicon heuristics on captions.
- **Creator “authority”** is a **directory match**, not a quality endorsement.
- **Engagement** (saves/citations) is **not** read from analytics in Phase 1; hook exists as `engagementBoost` for future local or server aggregates.
- **Search hits** without a public `momentId` use a synthetic id `videoId:roundedStart` for analytics only.

---

## User-feedback rationale

Users asked for **explainable** triage: badges answer “is this likely a tutorial snippet, a hot take, or noise?” without claiming correctness. The expandable **“Why this moment?”** ties labels back to observable inputs (phrase shape, snippet density, channel context).

---

## Analytics

| Event | When |
|-------|------|
| `quality_signal_view` | First paint of a `MomentQualitySignals` block for a `(momentId, surface)` pair. |
| `quality_explanation_open` | User opens the “Why this moment?” panel (badge or text control). |
| `quality_badge_click` | User clicks the pill badge (also opens panel when expanding). |

**Payload:** `momentId`, `phrase`, `videoId`, `qualityTier`, `signals` (pipe-joined), plus `surface` for debugging funnels.

---

## Commands

```bash
npm run validate:quality-signals
```
