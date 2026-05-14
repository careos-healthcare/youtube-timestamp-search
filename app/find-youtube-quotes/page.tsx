import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { PRODUCT_META_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";

export const metadata: Metadata = {
  title: "Find exact quotes inside long YouTube videos",
  description: PRODUCT_META_DESCRIPTION,
};

export default function FindYouTubeQuotesPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Find exact quotes inside long-form video"
        description={`${PRODUCT_WEDGE} Search the transcript and jump to the quote — without scrubbing.`}
        bullets={[
          "Search inside the transcript like a webpage index",
          "Jump to the exact quote timestamp",
          "Works on lectures, podcasts, and tutorials",
          "No accounts or creator tools",
        ]}
        suggestedSearches={["quote", "discipline", "pricing", "focus", "startup"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
