import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { PRODUCT_META_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";

export const metadata: Metadata = {
  title: "Search inside YouTube captions and transcripts",
  description: PRODUCT_META_DESCRIPTION,
};

export default function SearchYouTubeCaptionsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Search inside YouTube captions and transcripts"
        description={`${PRODUCT_WEDGE} Find exact mentions in tutorials, lectures, and long videos.`}
        bullets={[
          "Search caption text when available",
          "Find exact useful moments fast",
          "Works on tutorials and lectures",
          "Public index — no sign-up required",
        ]}
        suggestedSearches={["captions", "transcript", "tutorial", "javascript", "algorithm"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
