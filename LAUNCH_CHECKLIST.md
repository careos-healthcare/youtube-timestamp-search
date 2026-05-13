# Launch Checklist

## Deploy to Vercel

- [ ] Push the latest code to GitHub
- [ ] Import the repo into Vercel
- [ ] Confirm framework preset is `Next.js`
- [ ] Confirm build command is `next build`
- [ ] Deploy production
- [ ] Open the live production URL

## Connect Custom Domain

- [ ] Add the custom domain in Vercel project settings
- [ ] Update DNS records at the domain provider
- [ ] Wait for SSL certificate provisioning
- [ ] Confirm the site loads on both root domain and preferred canonical host
- [ ] If using a custom domain, set `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy

## Verify Mobile

- [ ] Open the homepage on a real phone
- [ ] Confirm the search form fits above the fold cleanly
- [ ] Confirm the CTA stays easy to tap
- [ ] Confirm result cards remain readable on small screens
- [ ] Confirm copied-state buttons and outbound links work on mobile Safari and Chrome

## Verify Transcript Failure State

- [ ] Test a video with searchable captions enabled
- [ ] Test a video with captions unavailable
- [ ] Confirm the UI shows:
  - `This video does not expose searchable captions.`
  - `Try another public video with captions enabled.`

## Verify Demo Link

- [ ] Click `Try a demo video`
- [ ] Confirm the demo URL populates
- [ ] Confirm the demo search phrase populates
- [ ] Run the demo search and confirm results appear

## Verify Social Previews

- [ ] Paste the production URL into the X card validator or a social preview tool
- [ ] Paste the production URL into a LinkedIn post draft
- [ ] Confirm the favicon appears correctly
- [ ] Confirm the OG preview image renders correctly

## Verify Lighthouse

- [ ] Run Lighthouse on the production homepage
- [ ] Check mobile performance
- [ ] Check accessibility
- [ ] Check SEO basics
- [ ] Save one screenshot of the score for launch notes

## Verify Basic SEO Indexing Readiness

- [ ] Confirm page title renders correctly
- [ ] Confirm meta description renders correctly
- [ ] Confirm `robots.txt` is live
- [ ] Confirm `sitemap.xml` is live
- [ ] Confirm the homepage has crawlable static text below the fold
- [ ] Submit the domain to Google Search Console after launch

## Final Go / No-Go

- [ ] One successful caption-enabled search in production
- [ ] One transcript-unavailable test in production
- [ ] One result click tracked
- [ ] No visual breakage on mobile
- [ ] Social preview looks acceptable
- [ ] Launch posts prepared and copied into a notes app
