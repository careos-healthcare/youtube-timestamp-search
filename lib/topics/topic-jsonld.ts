import type { TopicHub } from "@/lib/topics/topic-hub-types";
import {
  buildPublicMomentPath,
  buildSearchPath,
  buildTopicPath,
  buildVideoPath,
  getSiteUrl,
} from "@/lib/seo";

export function buildTopicIntelligenceJsonLd(hub: TopicHub) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${buildTopicPath(hub.slug)}`;

  const items = hub.moments.slice(0, 18).map((m, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${siteUrl}${buildPublicMomentPath(m.id, m.canonicalSlug)}`,
    name: m.phrase,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${hub.displayTitle} — transcript research hub`,
        description: hub.description,
        isPartOf: { "@type": "WebSite", name: "YouTube Time Search", url: siteUrl },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Topics", item: `${siteUrl}/topics` },
          { "@type": "ListItem", position: 3, name: hub.displayTitle, item: pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: `Videos discussing ${hub.displayTitle}`,
        itemListElement: hub.videos.slice(0, 8).map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${siteUrl}${buildVideoPath(v.videoId)}`,
          name: v.title,
        })),
      },
      {
        "@type": "ItemList",
        name: "Related searches",
        itemListElement: hub.relatedSearches.slice(0, 8).map((q, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${siteUrl}${buildSearchPath(q)}`,
          name: q,
        })),
      },
    ],
  };
}
