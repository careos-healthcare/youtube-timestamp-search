import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";

export const metadata: Metadata = {
  title: "Find YouTube Quotes Instantly",
  description:
    "Find exact quotes inside YouTube videos by searching transcripts and jumping to the right timestamp.",
};

export default function FindYouTubeQuotesPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Find YouTube quotes without scrubbing"
        description="Search any YouTube video transcript and jump to the exact quote. Perfect for podcasts, interviews, lectures, and long-form videos."
        bullets={[
          "Find the exact quote in seconds",
          "Jump straight to the timestamp",
          "Works on public videos with captions",
          "No sign-up needed",
        ]}
        suggestedSearches={["quote", "discipline", "pricing", "focus", "startup"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
