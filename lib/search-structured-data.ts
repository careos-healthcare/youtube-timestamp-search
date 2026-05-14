import type { SearchLandingData } from "@/lib/search-landing-engine";
import { getSiteUrl, buildSearchPath } from "@/lib/seo";

export function buildSearchLandingStructuredData(data: SearchLandingData) {
  const pageUrl = `${getSiteUrl()}${buildSearchPath(data.phrase)}`;
  const phrase = data.phrase;

  const faq = {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: `Where is "${phrase}" discussed in YouTube videos?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            data.moments.length > 0
              ? `We found ${data.moments.length} indexed moment(s) across ${data.videoCount} video(s) mentioning "${phrase}". Each result links to the exact timestamp.`
              : `Paste a YouTube URL on the homepage to search inside a video for "${phrase}".`,
        },
      },
      {
        "@type": "Question",
        name: `How do I jump to "${phrase}" in a long YouTube video?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Search the transcript for your phrase and open the timestamp link to jump directly on YouTube without scrubbing.",
        },
      },
    ],
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: "Search", item: `${getSiteUrl()}/transcripts` },
      { "@type": "ListItem", position: 3, name: phrase, item: pageUrl },
    ],
  };

  const itemList = {
    "@type": "ItemList",
    "@id": `${pageUrl}#results`,
    name: `Video moments for "${phrase}"`,
    numberOfItems: data.moments.length,
    itemListElement: data.moments.slice(0, 20).map((moment, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${getSiteUrl()}${moment.momentPath}`,
      name: `${moment.videoTitle} at ${moment.timestamp}`,
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `Search inside video for "${phrase}"`,
        description: `Find exact useful moments about "${phrase}" inside long-form YouTube videos.`,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: getSiteUrl() },
      },
      breadcrumb,
      faq,
      itemList,
    ],
  };
}
