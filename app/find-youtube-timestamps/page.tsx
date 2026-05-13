import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";

export const metadata: Metadata = {
  title: "Find YouTube Timestamps Instantly",
  description:
    "Search YouTube transcripts and find exact timestamps for quotes, topics, and keywords.",
};

export default function FindYouTubeTimestampsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Find YouTube timestamps instantly"
        description="Paste a YouTube link, search the transcript, and open the exact timestamp where something is mentioned."
        bullets={[
          "Stop scrubbing through long videos",
          "Search by phrase or keyword",
          "Copy and share timestamp links",
          "Mobile-friendly and fast",
        ]}
        suggestedSearches={["timestamp", "moment", "quote", "lecture", "tutorial"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
