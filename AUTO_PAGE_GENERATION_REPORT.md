# Auto Page Generation Report

Generated: 2026-05-14T22:18:01.512Z
Query intelligence snapshot: 2026-05-14T22:11:45.376Z
Evaluated: 23
Accepted: 21
Rejected: 2

## Accepted pages

| Rank | Type | Phrase | Path | Moments | Videos | Sitemap | Opportunity |
|------|------|--------|------|--------:|-------:|:-------:|------------:|
| 1 | search | my first million business | /search/my-first-million-business | 20 | 15 | yes | 49.5 |
| 2 | search | my first million side-hustle | /search/my-first-million-side-hustle | 20 | 14 | yes | 49.5 |
| 3 | search | the net ninja javascript | /search/the-net-ninja-javascript | 20 | 19 | yes | 49.5 |
| 4 | search | the net ninja react | /search/the-net-ninja-react | 20 | 19 | yes | 49.5 |
| 5 | search | the net ninja web-development | /search/the-net-ninja-web-development | 20 | 19 | yes | 49.5 |
| 6 | search | the plain bagel index-funds | /search/the-plain-bagel-index-funds | 20 | 19 | yes | 49.5 |
| 7 | search | google cloud | /search/google-cloud | 17 | 13 | yes | 49.2 |
| 8 | search | javascript code | /search/javascript-code | 15 | 9 | yes | 49.2 |
| 9 | search | web server | /search/web-server | 20 | 12 | yes | 49.2 |
| 10 | search | web page | /search/web-page | 20 | 11 | yes | 49.2 |
| 11 | search | create react | /search/create-react | 16 | 8 | yes | 49.2 |
| 12 | search | react app | /search/react-app | 14 | 8 | yes | 49.2 |
| 13 | search | i'll talk | /search/i'll-talk | 20 | 12 | yes | 49.2 |
| 14 | search | every time | /search/every-time | 20 | 11 | yes | 49.2 |
| 15 | search | react component | /search/react-component | 16 | 11 | yes | 49.2 |
| 16 | search | react router | /search/react-router | 11 | 6 | yes | 49.2 |
| 17 | search | create exercise | /search/create-exercise | 6 | 4 | yes | 49.2 |
| 18 | search | exercise list | /search/exercise-list | 4 | 2 | yes | 49.2 |
| 19 | search | find out | /search/find-out | 20 | 12 | yes | 49.2 |
| 20 | search | programming language | /search/programming-language | 20 | 10 | yes | 49.2 |
| 21 | search | index html | /search/index-html | 15 | 9 | yes | 49.2 |

## Rejected candidates

| Rank | Type | Phrase | Reason |
|------|------|--------|--------|
| 1 | search | y combinator startup school startup | Duplicate intent suppressed |
| 2 | search | exercise component | Thin page: 2 moments (minimum 3) |

## Quality guards applied

- Minimum 3 moments for indexable pages
- Spam / corpus-noise rejection
- Canonical slug normalization
- Duplicate-intent suppression
- noindex for thin low-confidence pages

## Regenerate

```bash
npm run queries:intelligence
npm run pages:generate
npm run pages:validate
```

Machine-readable output: `data/page-generation/generated-pages.json`
Generated seeds: `lib/generated-search-query-seeds.ts`, `lib/generated-topic-seeds.ts`
