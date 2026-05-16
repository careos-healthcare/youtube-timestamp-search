# Research workflow metrics

## Why workflow depth beats pageviews

Pageviews and unique visitors reward **shallow SEO landings**: one query, one bounce, no evidence the product supports real research. For a transcript-backed citation tool, success is measured by **repeat research workflows** — query chains, topic depth, compare usage, citation exports, saves, and returns to a personal library.

This phase adds **session intelligence** and **persistent analytics** to test behavioral lock-in potential without AI summaries, embeddings, or UI redesign.

## Research session model

Each browser tab gets a `researchSessionId` (sessionStorage). Events attach:

- `researchSessionId`
- `queryChainLength` / `topicChainLength` (lightweight client hints)
- Surface-specific fields (`topicSlug`, `format`, `clipCount`, etc.)

Server-side reports reconstruct sessions from `search_analytics_events` using `payload.researchSessionId` (fallback: search `sessionId`, then 15-minute time bucket).

## Research depth score (0–100)

Deterministic formula in `lib/research/research-session.ts` → `calculateResearchDepthScore`:

| Signal | Points (capped) |
|--------|-----------------|
| Query chain length | 12 × min(length, 6) |
| Topic chain length | 10 × min(length, 5) |
| Compare used | 15 (once) |
| Citation export | 12 × min(exports, 3) |
| Save | 14 × min(saves, 2) |
| Return to saved library | 18 |
| Collection visit | 8 × min(visits, 2) |
| Research export | 12 |
| Repeated topic interaction | 10 |

## Repeat research behavior

`detectRepeatResearchBehavior` is true when any of:

- Same topic slug interacted with ≥ 2 times in the session
- Duplicate topics or queries in chains (revisit within session)
- Saved library return with prior save in session

## Workflow cohorts (explicit rules)

Evaluated in priority order in `classifyResearchWorkflowCohort`:

1. **repeat_researcher** — repeat behavior AND depth ≥ 45  
2. **researcher** — depth ≥ 60 AND (citation OR save OR query chain ≥ 2 OR export)  
3. **active_explorer** — depth 35–59 AND (topic chain ≥ 2 OR compare OR collection OR query chain ≥ 2)  
4. **bounce** — depth &lt; 15 AND no compare/cite/save AND ≤ 1 query/topic  
5. **casual_lookup** — default middle tier  

## Analytics events

| Event | When |
|-------|------|
| `research_session_started` | First research instrumentation in tab |
| `research_session_extended` | Query/topic/save surface actions |
| `research_compare_used` | Compare section view or click |
| `research_chain_depth` | New query or topic in chain |
| `repeat_topic_research` | Second+ interaction on same topic |
| `citation_workflow_completed` | Citation/embed copy |
| `saved_research_return` | Saved library open with clips |
| `collection_revisit` | Second+ visit to same collection slug |
| `research_export_completed` | Saved library export |

Legacy events (`topic_page_view`, `moment_citation_copy`, etc.) still contribute when grouped into the same `researchSessionId`.

## Limitations

- **Client-only saves** — library is localStorage; cross-device return is invisible.  
- **Supabase optional** — `npm run report:research-sessions` returns zero sessions without admin DB credentials.  
- **Vercel-only events** — events that only call `trackEvent` are not in `search_analytics_events` unless migrated to `trackPersistentEvent`.  
- **Depth score is a proxy** — not ground-truth research quality; human validation still required.  
- **No identity** — sessions are tab-scoped, not user accounts.

## What would constitute genuine product pull

Evidence to seek in `RESEARCH_SESSION_REPORT.md`:

- **seriousResearchProxyRate** rising week over week  
- **repeat_researcher** cohort share &gt; 10% of instrumented sessions  
- **citationWorkflowCompletionRate** correlating with **save→return rate**  
- **avgTopicChainLength** &gt; 1.5 on topic hub traffic  
- Compare + citation in the same session (depth ≥ 60) without paid acquisition spikes  

Not goals for this phase: traffic growth, AI features, or recommendation systems.

## Commands

```bash
npm run report:research-sessions
```
