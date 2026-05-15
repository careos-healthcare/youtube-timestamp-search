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

const TRENDING_PAGE_NAME = "Trending video searches";
const TRENDING_PAGE_DESCRIPTION =
  "Discovery page for trending searchable video moments, creators, and topics on YouTube Time Search.";

const SAVED_PAGE_NAME = "Saved video moments";
const SAVED_PAGE_DESCRIPTION =
  "Local saved video timestamp library — bookmarked transcript moments on this device only.";

/** WebPage + breadcrumb for `/trending` (indexable discovery hub). */
export function buildTrendingDiscoveryStructuredData() {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/trending`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: TRENDING_PAGE_NAME,
        description: TRENDING_PAGE_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: siteUrl },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: TRENDING_PAGE_NAME, item: pageUrl },
        ],
      },
    ],
  };
}

/** Minimal WebPage JSON-LD for `/saved` (noindex in HTML metadata; not for sitemap). */
export function buildSavedMomentsStructuredData() {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/saved`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: SAVED_PAGE_NAME,
        description: SAVED_PAGE_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: siteUrl },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: SAVED_PAGE_NAME, item: pageUrl },
        ],
      },
    ],
  };
}
