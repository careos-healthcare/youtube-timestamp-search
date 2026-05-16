# Research Engine Layer (Phase 1) — Implementation Report

## Summary

Shipped a **transcript-backed, heuristic** research layer: grouped “best answer” slots, compare-explanations panels, **source context** labels (not fact-checks), static public collections, sharper homepage positioning, **request indexing** intake via analytics, expanded **spoken knowledge library** UX on `/saved`, and new analytics events. **No generative AI**, no auth/billing/extensions as scoped.

## What was built

| Area | Details |
|------|---------|
| Research grouping | `buildResearchAnswerFromPublicMoments` / `buildResearchAnswerFromSearchMoments` assign slots: best, beginner, technical, counterpoint, primary-source style, optional local engagement when provided |
| Compare | `comparePublicMomentsForTopic` / `compareSearchMoments` — diverse videos, framing labels (beginner / technical / opinion / tutorial / caveat) |
| Source authority | `evaluateSourceAuthority` / `evaluateSourceAuthorityForPublicMoment` — `sourceAuthorityLabel`, `sourceAuthorityReason`, `sourceAuthorityConfidence` |
| Collections | Five static slugs under `lib/collections/static-collections.ts`; pages at `/collections` and `/collections/[slug]` with JSON-LD `ItemList` |
| Request indexing | `RequestSourceIndexForm` + `source_index_request` event (URL, optional topic/email, source type, surface) |
| Library UX | `/saved` copy, grouping by query thread, `exportSpokenKnowledgeLibraryMarkdown`, `saved_library_export` on export |
| Homepage | `HOME_HERO_HEADLINE` + three example paths (search / topic / collection) |

## New / changed routes

| Route | Notes |
|-------|--------|
| `/collections` | Index of static collections |
| `/collections/best-rag-explanations` | + 4 other slugs (see below) |
| Existing | Topic + search pages gain research/compare sections when enough moments |

**Collection URLs (canonical paths):**

- `/collections/best-rag-explanations`
- `/collections/kubernetes-explained`
- `/collections/anthropic-ai-safety`
- `/collections/startup-advice`
- `/collections/typescript-explanations`

Also: `app/sitemap.ts` includes `/collections` and each collection slug.

## New modules

- `lib/research/research-answer-types.ts`
- `lib/research/classify-explanation-role.ts`
- `lib/research/source-authority.ts`
- `lib/research/compare-explanations.ts`
- `lib/research/build-research-answer.ts`
- `lib/research/index.ts`
- `lib/collections/static-collections.ts`
- `lib/collections/index.ts`

## New UI components

- `components/source-authority-badge.tsx`
- `components/research-answer-view-beacon.tsx`
- `components/research-explanation-slot-link.tsx`
- `components/research-answer-public-section.tsx`
- `components/research-answer-search-section.tsx`
- `components/compare-explanations-section.tsx`
- `components/request-source-index-form.tsx`
- `components/moment-trust-context-strip.tsx`
- `components/collection-page-view-beacon.tsx`
- `components/collection-moment-card.tsx`

## SEO helpers

- `buildCollectionsIndexPath`, `buildCollectionPath`, `createCollectionsIndexMetadata`, `createCollectionPageMetadata` in `lib/seo.ts`

## Source-authority heuristics (high level)

Ordered checks on **title + snippet + channel + phrase** (and creator DB match): primary-source wording → tutorial/course cues → academic/institutional cues → founder/operator wording → opinion hedging → podcast/interview packaging → else practitioner if creator profile matches → default **unknown / weak context**. **Never claims verified truth** — copy states “heuristic label · not a fact-check” where expanded.

## Analytics events (compact payloads)

| Event | Typical fields |
|-------|----------------|
| `research_answer_view` | `query`, `topic?`, `surface` |
| `research_explanation_click` | `query`, `topic?`, `slotKey`, `momentId`, `videoId`, `qualityTier`, `sourceAuthorityLabel`, `surface` |
| `compare_explanations_view` | `query`, `topic?`, `rowCount`, `surface` |
| `compare_explanation_click` | `query`, `topic?`, `momentId`, `videoId`, `qualityTier`, `sourceAuthorityLabel`, `surface` |
| `source_authority_badge_view` | `momentId`, `videoId`, `phrase`, `query?`, `surface`, `sourceAuthorityLabel` |
| `source_authority_explanation_open` | same + open action |
| `source_index_request` | `requestedUrl`, `topic?`, `sourceType`, `surface`, `hasEmail` |
| `collection_page_view` | `topic` (collection slug), `momentCount`, `surface` |
| `collection_moment_click` | `topic`, `momentId`, `videoId`, `qualityTier`, `sourceAuthorityLabel`, `surface` |
| `saved_library_export` | `surface`, `format`, `clipCount` |

Persisted via existing `POST /api/analytics/event` + `trackPersistentEvent` / `trackEvent` as elsewhere.

## Limitations

- **Engagement slot** (`mostEngaged`) only fills when `engagementByMomentId` is passed (not wired server-side yet).
- **Collections** depend on `data/public-moments.json` IDs; if IDs rotate at materialize time, a collection may temporarily show fewer cards.
- **Source labels** can misfire on ambiguous titles; confidence is surfaced explicitly.
- **SEO quick audit** against **production** will **404** on `/collections*` until the next deploy (local/build routes validate in `next build`).

## Validation checklist

| Check | Status |
|-------|--------|
| `npm run lint` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npm run audit:seo:quick` | Pass except prod 404 on new collection URLs (pre-deploy) |

**Manual (post-deploy):** one collection page, one topic hub with ≥3 moments, one moment page, `/saved`, homepage examples, request form on empty search / trending / moments.

## Remaining risks

- Analytics payload size / cardinality on `source_index_request` (URLs stored in `payload` JSON in Supabase when configured).
- User trust: labels must stay **context**, not **endorsement** — keep copy discipline on future edits.

## Addressing “all opinions seem equal”

Partially: users see **who** (channel/title), **clip signals**, **source context**, **compare** paths, and explicit **transcript-only** framing. This improves triage without asserting correctness.
