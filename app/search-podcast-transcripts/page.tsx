import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { PRODUCT_META_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";

export const metadata: Metadata = {
  title: "Search inside long podcast videos on YouTube",
  description: PRODUCT_META_DESCRIPTION,
};

export default function SearchPodcastTranscriptsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Search inside long podcast episodes"
        description={`${PRODUCT_WEDGE} Find the exact moment in multi-hour episodes by searching the transcript.`}
        bullets={[
          "Search inside episode transcripts instantly",
          "Find topics, quotes, and keywords",
          "Open exact timestamps in YouTube",
          "Built for long-form interviews and deep dives",
        ]}
        suggestedSearches={["podcast", "dopamine", "sleep", "focus", "interview"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
