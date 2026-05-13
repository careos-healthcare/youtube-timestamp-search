# Analytics and CTA Notes

## Vercel Analytics

`@vercel/analytics` is enabled in `app/layout.tsx` via the `<Analytics />` component.

Enable **Web Analytics** in the Vercel project dashboard to view traffic in production.

## Custom events

Events are sent through `lib/analytics.ts` using Vercel Analytics `track()`.

| Event | When it fires |
|---|---|
| `search_submitted` | User submits the transcript search form |
| `transcript_load_success` | `/api/transcript` returns a usable transcript |
| `transcript_load_failed` | Transcript fetch fails or is unavailable |
| `cta_email_submitted` | Waitlist email is successfully submitted |
| `cta_chrome_extension_clicked` | User clicks the Chrome extension waitlist action |
| `cta_api_access_clicked` | User clicks the API access waitlist action |
| `cta_save_search_clicked` | User clicks the save searches coming-soon action |

## CTA section

A lightweight CTA block appears below the search form on the homepage.

It captures email interest for:
- general waitlist
- Chrome extension
- API access
- save searches (coming soon)

## Waitlist API

`POST /api/waitlist`

Body:

```json
{
  "email": "you@example.com",
  "interest": "chrome_extension"
}
```

Allowed `interest` values:
- `waitlist`
- `chrome_extension`
- `api_access`
- `save_searches`

For now, submissions are validated and logged server-side only. No database is used yet.
