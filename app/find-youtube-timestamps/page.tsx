import type { Metadata } from "next";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { PRODUCT_META_DESCRIPTION, PRODUCT_WEDGE } from "@/lib/product-copy";

export const metadata: Metadata = {
  title: "Find exact moments in long YouTube videos",
  description: PRODUCT_META_DESCRIPTION,
};

export default function FindYouTubeTimestampsPage() {
  return (
    <PageShell>
      <SeoLandingPage
        title="Find exact useful moments in long-form YouTube videos"
        description={PRODUCT_WEDGE}
        bullets={[
          "Search inside the transcript like a webpage index",
          "Jump to the exact timestamp instantly",
          "Works for lectures, podcasts, and tutorials",
          "No accounts or creator tools required",
        ]}
        suggestedSearches={["machine learning", "startup advice", "python tutorial", "interview", "lecture"]}
      />
      <SiteFooter />
    </PageShell>
  );
}
