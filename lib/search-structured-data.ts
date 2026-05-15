import type { SearchLandingData } from "@/lib/search-landing-engine";
import { getSiteUrl, buildSearchPath } from "@/lib/seo";

export function buildSearchLandingStructuredData(data: SearchLandingData) {
  const pageUrl = `${getSiteUrl()}${buildSearchPath(data.phrase)}`;
  const phrase = data.phrase;

  const faqEntities = [
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
  ];

  if (data.answer.mode === "answer" && data.answer.answerSnippet && data.answer.sourceMoment) {
    faqEntities.unshift({
      "@type": "Question",
      name: phrase.endsWith("?") ? phrase : `What is ${phrase}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${data.answer.answerSnippet} (Transcript excerpt from ${data.answer.sourceMoment.videoTitle} at ${data.answer.sourceMoment.timestamp}.)`,
      },
    });
  }

  const faq = {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqEntities,
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

  const timedOut = Boolean(data.loadMeta?.timedOut);
  const pageDescription = timedOut
    ? `This search page is available for "${phrase}". The live index was slow to respond; use the search box below or paste a YouTube URL on the homepage to search transcripts.`
    : `Find exact useful moments about "${phrase}" inside long-form YouTube videos.`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: `Search inside video for "${phrase}"`,
      description: pageDescription,
      isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: getSiteUrl() },
    },
    breadcrumb,
    faq,
    itemList,
  ];

  if (data.answer.mode === "answer" && data.answer.answerSnippet && data.answer.sourceMoment) {
    graph.push({
      "@type": "Quotation",
      "@id": `${pageUrl}#best-answer`,
      text: data.answer.answerSnippet,
      isPartOf: {
        "@type": "VideoObject",
        name: data.answer.sourceMoment.videoTitle,
        url: data.answer.sourceMoment.youtubeUrl,
      },
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
