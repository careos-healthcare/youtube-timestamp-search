# Corpus ingestion — Wave 1 (selective)

This wave is a **small, allowlist-first ingestion batch** (36 long-form targets). It uses Phase 2 infrastructure only: **no bulk crawl**, **no random YouTube discovery**, **no UI changes**, and **no execution of ingest workers** in this step.

## Inputs reviewed

| Input | Takeaway for Wave 1 |
|-------|---------------------|
| `TOPIC_COVERAGE_REPORT.md` | Many technical topics show **weak comparison depth** (single video / single creator). Kubernetes, Docker, ML, and transformers clusters need **additional creators** and **multi-video depth**. |
| `MISSING_CORPUS_REPORT.md` | **Hugging Face**, **Berkeley AI Research**, **GOTO Conferences**, and **Strange Loop Conference** appear as **high-priority allowlist seed gaps** (not seen in indexed moment channel names). |
| `CORPUS_HEALTH_REPORT.md` | Only **53 indexed videos** / **14 creators** with a **tutorial-heavy** mix; **academic_technical** and **primary_source** slices are thin — university + conference seeds help. |
| `data/source-allowlists/*` | Every candidate maps to an **enabled** row in these JSON lists. |
| `data/ingestion-queues/*` | **Rejected** queue is empty — no dedupe conflict with Wave 1 keys. |

## Objectives

1. **Close allowlist seed gaps** called out in the missing-corpus report (HF, BAIR, GOTO, Strange Loop).
2. **Deepen weak comparison topics** (especially Kubernetes / Docker / transformers / ML fundamentals) with **additional long-form** sources already trusted in allowlists.
3. **Improve authority diversity** (interviews + lectures + conference keynotes + practitioner courses) without chasing viral or reaction content.
4. Keep the batch **≤ 50** items and **dedupe-safe** (`wave1:video:<id>` keys in `data/ingestion-wave-1-candidates.json`).

## Selection rules (Wave 1)

- **Allowlist anchor**: each row’s `matchedAllowlistChannel` must be an **enabled** allowlist channel; `scoreIngestionSource` is run with optimistic transcript/duration priors consistent across the batch (see validator).
- **Priority mix**: AI research interviews, ML engineering / HF curriculum, Docker+Kubernetes long courses, YC + a16z founder/operator commentary, MIT/Stanford/BAIR-shaped lectures, GOTO/Strange Loop conference talks, Corey Schafer programming depth.
- **Risk tagging**: `medium` where transcripts or uploaders should be **verified at ingest** (some BAIR co-hosted uploads; a16z opinion-heavy; multi-speaker GOTO panels).

## Candidate table (summary)

The canonical machine-readable list is **`data/ingestion-wave-1-candidates.json`** (36 rows). Each entry includes:

- `videoId`, `url`, `channelName`, `videoTitle`
- `matchedAllowlistChannel`, `allowlistCategory`
- `targetTopics` (controlled vocabulary in `lib/corpus/ingestion-wave-1-target-topics.ts`)
- `expectedTopicCoverageGain`, `riskLevel`, `rationale`
- `durationMinutesEstimate` (used for scoring parity)
- `sourceQuality` (`score`, `tier`, `reasons`, `penalties`, `ingestRecommendation`)

### Counts by allowlist category

| Category | Approx. rows in Wave 1 JSON |
|----------|------------------------------|
| `ai_research` | 9 |
| `ml_engineering` | 6 |
| `backend_devops` | 2 |
| `university_lectures` | 6 |
| `startup_founder` | 5 |
| `conference_talks` | 6 |
| `programming_tutorials` | 2 |

## Expected coverage impact (heuristic)

- **Kubernetes / Docker**: multiple creators (freeCodeCamp.org, TechWorld with Nana) + long runtimes → better **comparison depth** and **authority diversity** vs single-video flags in topic coverage.
- **Transformers / HF**: official Hugging Face course chapters + Yannic paper walkthroughs → thicker **transformer** and **HF** moment potential.
- **University / research**: MIT 6.034 + Stanford CS229 + BAIR-aligned seminars → more **academic_technical** / citation-friendly explanations.
- **Startup**: YC lecture series + selective a16z episodes → structured **founder** narratives; keep opinion labels at moment layer.
- **Conferences**: GOTO + Strange Loop classics → software design vocabulary and **counterpoint-rich** panels.

## Risks & mitigations

| Risk | Mitigation at next phase (ingest execution) |
|------|---------------------------------------------|
| **Uploader ≠ allowlist brand** (some co-hosted seminars) | Verify channel handle + title match before materializing moments; drop or re-queue if transcript density fails. |
| **Near-duplicate curricula** (multiple Docker/K8s full courses) | Run `lib/corpus/dedupe.ts` heuristics + human spot-check for overlapping labs. |
| **Opinion-heavy VC podcasts** (a16z) | Tag `opinion_heavy` / `founder_operator` at moment extraction; do not treat as primary citations. |
| **Short HF intro chapters** | Pair with longer chapters in the same ingest window; scoring already assumes transcript availability. |

## Validation

```bash
npm run validate:ingestion-wave-1
```

Checks: **≤ 50** candidates, **unique video IDs**, **enabled allowlist match**, **no rejected-queue collision**, **target topic registry**, **sourceQuality present**, **scores recomputed** with `CORPUS_SCORING_SKIP_ANALYTICS=1` to match stored tier/score/recommendation.

## Regenerating candidate JSON (optional)

If titles or channels change, regenerate the JSON (not part of default CI):

```bash
CORPUS_SCORING_SKIP_ANALYTICS=1 npx tsx scripts/materialize-ingestion-wave-1-candidates.ts
```

## Explicitly out of scope (Wave 1)

- Running ingest workers / bulk download jobs.
- Broad crawling or non-allowlisted “trending” discovery.
- UI or marketing surfaces for this batch.
