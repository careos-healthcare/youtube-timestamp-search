import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";

export const metadata: Metadata = {
  title: "Search YouTube Captions and Transcripts",
  description:
    "Search YouTube captions and transcripts to find the exact moment in any public video.",
};

export default function SearchYouTubeCaptionsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Search YouTube captions and transcripts"
        description="Find exact moments in YouTube videos by searching captions and transcript text, then jump to the timestamp instantly."
        bullets={[
          "Search captions when available",
          "Find exact mentions fast",
          "Works on tutorials and lectures",
          "Shareable result pages",
        ]}
        suggestedSearches={["captions", "transcript", "tutorial", "javascript", "algorithm"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
