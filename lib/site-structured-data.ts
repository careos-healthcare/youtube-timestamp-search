import { PRODUCT_META_DESCRIPTION, PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildMomentsIndexPath, buildPublicMomentUrl, buildTranscriptsIndexPath, getSiteUrl } from "@/lib/seo";

import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

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

/** Discovery hub for curated canonical moment URLs. */
export function buildMomentsDiscoveryStructuredData(momentCount: number) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${buildMomentsIndexPath()}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Best searchable video moments",
        description:
          "Curated list of high-signal transcript moments from the public index, grouped for discovery.",
        numberOfItems: momentCount,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: siteUrl },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Best moments", item: pageUrl },
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

/** Canonical public moment page: WebPage + VideoObject + BreadcrumbList. */
export function buildPublicMomentStructuredData(row: PublicMomentRecord) {
  const siteUrl = getSiteUrl();
  const pageUrl = buildPublicMomentUrl(row.id, row.canonicalSlug);
  const videoPageUrl = `${siteUrl}/video/${row.videoId}`;
  const title = row.videoTitle?.trim() || `YouTube video ${row.videoId}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `Transcript moment: “${row.phrase}” — ${title}`,
        description: row.snippet.slice(0, 300),
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: siteUrl },
        mainEntity: { "@id": `${pageUrl}#video` },
      },
      {
        "@type": "VideoObject",
        "@id": `${pageUrl}#video`,
        name: title,
        description: row.snippet.slice(0, 500),
        embedUrl: row.youtubeUrl,
        ...(row.channelName ? { author: { "@type": "Organization", name: row.channelName } } : {}),
        potentialAction: {
          "@type": "WatchAction",
          target: row.youtubeUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Video", item: videoPageUrl },
          { "@type": "ListItem", position: 3, name: "Moment", item: pageUrl },
        ],
      },
      ...(row.snippet.trim().length > 0
        ? [
            {
              "@type": "Quotation",
              "@id": `${pageUrl}#quote`,
              text: row.snippet.slice(0, 2000),
              url: pageUrl,
              name: `Transcript excerpt: “${row.phrase.slice(0, 120)}${row.phrase.length > 120 ? "…" : ""}”`,
            },
          ]
        : []),
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
