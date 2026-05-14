# Index quality report

Generated: 2026-05-14T18:31:28.169Z

## Summary

| Metric | Value |
|--------|------:|
| Indexed videos | 232 |
| Priority search routes | 30 |
| Search landings with results | 30 |
| Empty search landings | 0 |
| Thin search landings (<3 moments) | 0 |
| Estimated sitemap URLs | 613 |
| Moment sitemap experiment | disabled |
| Moment URLs (if enabled) | 0 |
| SEO audit pass rate | 50/52 |

## Top 20 strongest search pages

| Rank | Query | Moments | Videos |
|------|-------|--------:|-------:|
| 1 | what is rag | 40 | 25 |
| 2 | how to learn python | 40 | 25 |
| 3 | ai agents | 40 | 25 |
| 4 | machine learning | 40 | 25 |
| 5 | large language models | 40 | 25 |
| 6 | prompt engineering | 40 | 25 |
| 7 | react hooks | 40 | 25 |
| 8 | system design | 40 | 25 |
| 9 | startup advice | 40 | 25 |
| 10 | deep work | 40 | 25 |
| 11 | neural networks | 40 | 25 |
| 12 | transformers | 40 | 25 |
| 13 | javascript | 40 | 25 |
| 14 | python tutorial | 40 | 25 |
| 15 | product market fit | 40 | 25 |
| 16 | sleep | 40 | 25 |
| 17 | focus | 40 | 25 |
| 18 | artificial intelligence | 40 | 25 |
| 19 | open source | 40 | 25 |
| 20 | vector database | 40 | 25 |

## Supabase migration

Apply analytics persistence migration:

```bash
cd supabase
supabase db push
```

Or link project and push from repo root:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

Migration file: `supabase/migrations/003_search_analytics_events.sql`

## Regenerate

```bash
npm run audit:seo
```
