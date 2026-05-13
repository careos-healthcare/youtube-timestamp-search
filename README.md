# YouTube Timestamp Search

This app lets someone paste a YouTube video URL, search the transcript, and jump to the exact timestamp where a phrase is mentioned.

It is intentionally small:
- no sign-up
- no saved history
- no summaries
- just transcript search and timestamp links

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production check

```bash
npm run lint
npm run build
```

## Vercel deploy steps

1. Push the project to GitHub.
2. Open [Vercel](https://vercel.com/new).
3. Import the repository.
4. Keep the framework preset as `Next.js`.
5. Leave the build command as `next build`.
6. Leave the output settings at the default.
7. Add the optional environment variable below if you want metadata and social previews to use the final production domain explicitly.
8. Click `Deploy`.

After deploy:

1. Open the live URL.
2. Run one successful transcript search.
3. Test one transcript-unavailable case.
4. Check the social preview.

## Environment variables

None are required.

Optional:

- `NEXT_PUBLIC_SITE_URL`
  - Example: `https://yourdomain.com`
  - Use this if you want metadata and OG URLs to resolve against your final custom domain.

## Known limitation

This app only works when transcript/captions are available for the target YouTube video.

More specifically:
- some public videos do not expose searchable captions
- auto-generated captions may be incomplete
- some videos may be unavailable, blocked, or rate-limited upstream

## Troubleshooting

### "Transcript unavailable for this video."
The video likely does not expose usable searchable captions for this tool.

Try another public video with captions enabled.

### "Invalid YouTube URL."
Use one of these formats:

- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`
- `https://www.youtube.com/embed/...`

### "No matching moment found."
Try a broader phrase or a single keyword that is more likely to appear verbatim in the captions.
