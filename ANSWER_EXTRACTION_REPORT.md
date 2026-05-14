# Answer Extraction Report — Phase 9

Exact-answer extraction pulls **verbatim transcript excerpts** from ranked search moments. No generative text is added. When confidence is below threshold (`0.58`), the page shows **Best matching moments** instead of a synthesized answer block.

## Module

- `lib/search/answer-extraction.ts` — scoring, snippet selection, 15–30s clip range, supporting moments
- `lib/search/landing-types.ts` — shared moment type
- `components/search-answer-panel.tsx` — Best answer / Jump / Supporting UI
- `lib/search-landing-engine.ts` — attaches `answer` to landing payload
- `lib/search-structured-data.ts` — FAQ + `Quotation` only when `mode === "answer"`

## Confidence signals

| Signal | Weight | Meaning |
|--------|--------|---------|
| Term coverage | 34% | Share of query tokens present in snippet |
| Retrieval score | 26% | Normalized hybrid/keyword rank |
| Answer wording | 24% | Definitional phrasing (`is`, `means`, `stands for`, etc.) |
| Segment density | 16% | Nearby hits in same video + corroboration across videos |

Labels: **high** ≥ 0.75 · **medium** ≥ 0.58 · **low** < 0.58 (moments-only UI)

## UI surfaces on `/search/[query]`

1. **Best answer** — blockquoted transcript excerpt + source video/timestamp
2. **Jump to exact moment** — YouTube deep link at recommended 15–30s range
3. **Supporting moments** — additional ranked hits (excluding primary)
4. **Related explanations** — corpus + analytics related searches
5. **More moments** — remaining ranked list (primary answer deduped)

## Validation queries (20)

Run locally: open `/search/<slug>` or call `getSearchLandingData(phrase)` in a script.

| # | Query | Expected mode | Notes |
|---|-------|---------------|-------|
| 1 | `what is mcp` | answer (if corpus hit) | Definitional “what is” pattern; acronym expansion in spoken form |
| 2 | `what is rag` | answer | Strong definitional seed query |
| 3 | `what is kubernetes` | answer | “X is a …” wording common in tutorials |
| 4 | `what is docker` | answer | Container explainer transcripts |
| 5 | `what is graphql` | answer | API definition moments |
| 6 | `what is dopamine` | answer | Science/podcast definitional tone |
| 7 | `what is product market fit` | answer | Business interview phrasing |
| 8 | `how to learn python` | answer or moments-only | Procedural; answer wording boost on “you can / first step” |
| 9 | `how to focus` | answer or moments-only | Self-improvement corpus |
| 10 | `prompt engineering` | moments-only | Keyword match without clear single-sentence definition |
| 11 | `javascript` | moments-only | Broad single-token query — low definitional clarity |
| 12 | `sleep` | moments-only | Ambiguous without question framing |
| 13 | `ai agents` | moments-only | Topical phrase; may lack one canonical answer line |
| 14 | `fine tuning` | moments-only | Technical term spread across many contexts |
| 15 | `nextjs` | moments-only | Short token; coverage without answer shape |
| 16 | `what is reinforcement learning` | answer | Academic explainer pattern |
| 17 | `what is a vector database` | answer | Strong “what is” + technical definition |
| 18 | `what is open source` | answer | Common definitional podcast clip |
| 19 | `saas pricing` | moments-only | Commercial topic without single spoken definition |
| 20 | `xyznonexistenttopic123` | moments-only | Zero hits → empty state / thin content |

### Manual checks per query

- [ ] Answer text is a **substring** of a transcript snippet (no paraphrase)
- [ ] YouTube jump link uses `t=` seconds from primary moment
- [ ] Clip range is **15–30 seconds**
- [ ] Low-confidence queries show **Best matching moments** banner, not Best answer
- [ ] JSON-LD adds FAQ answer + `Quotation` **only** when `answer.mode === "answer"`
- [ ] Supporting moments exclude the primary timestamp (±3s)

## Structured data policy

- Always: `WebPage`, `BreadcrumbList`, `FAQPage` (generic navigation questions)
- When answer extracted: extra FAQ entry with **verbatim excerpt** + source attribution in text
- When answer extracted: `Quotation` linked to `VideoObject` — no `ClaimReview` or authoritative medical/legal markup

## Example (illustrative)

**Query:** `what is rag`

**Best answer (excerpt only):**  
> "RAG is retrieval augmented generation, which means you retrieve relevant documents and feed them into the model context."

**Jump:** `12:04–12:26` (22s) → YouTube `&t=724`

**Supporting moments:** 2–6 additional hits from other videos/chapters

## Rollout

1. Deploy Phase 9 commit
2. Spot-check queries 1–7 and 16–18 on production corpus
3. Monitor `search_result_click` with `surface: best_answer` in analytics
4. Tune `CONFIDENCE_THRESHOLD` in `answer-extraction.ts` if false positives appear
