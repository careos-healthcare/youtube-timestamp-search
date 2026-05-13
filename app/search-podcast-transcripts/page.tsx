import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";

export const metadata: Metadata = {
  title: "Search Podcast Transcripts on YouTube",
  description:
    "Search long podcast transcripts on YouTube and jump to the exact moment without scrubbing.",
};

export default function SearchPodcastTranscriptsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Search podcast transcripts on YouTube"
        description="Find the exact moment in long podcast episodes by searching the transcript and opening the timestamp instantly."
        bullets={[
          "Search long podcast episodes fast",
          "Find quotes, topics, and keywords",
          "Open exact timestamps in YouTube",
          "Great for interviews and deep dives",
        ]}
        suggestedSearches={["podcast", "dopamine", "sleep", "focus", "interview"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
