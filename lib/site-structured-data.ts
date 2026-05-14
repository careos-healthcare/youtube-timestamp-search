import { PRODUCT_META_DESCRIPTION, PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildTranscriptsIndexPath, getSiteUrl } from "@/lib/seo";

export function buildHomeStructuredData() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: "YouTube Time Search",
        description: PRODUCT_META_DESCRIPTION,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search/{search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": siteUrl,
        url: siteUrl,
        name: PRODUCT_TAGLINE,
        description: PRODUCT_META_DESCRIPTION,
        isPartOf: { "@id": `${siteUrl}#website` },
      },
    ],
  };
}

export function buildTranscriptsIndexStructuredData(videoCount: number) {
  const pageUrl = `${getSiteUrl()}${buildTranscriptsIndexPath()}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Public video knowledge index",
        description:
          "Browse long-form YouTube videos indexed for in-video search with transcript-backed timestamps.",
        numberOfItems: videoCount,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: getSiteUrl() },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
          { "@type": "ListItem", position: 2, name: "Video index", item: pageUrl },
        ],
      },
    ],
  };
}
