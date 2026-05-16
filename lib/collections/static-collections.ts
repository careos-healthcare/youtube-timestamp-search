import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { getPublicMomentById } from "@/lib/moments/load-public-moments";

export type StaticPublicCollection = {
  slug: string;
  title: string;
  intro: string;
  /** Preferred order; missing IDs are skipped. */
  momentIds: string[];
  relatedTopicSlugs: string[];
  relatedSearches: string[];
};

export const STATIC_PUBLIC_COLLECTIONS: StaticPublicCollection[] = [
  {
    slug: "best-rag-explanations",
    title: "Best RAG-style explanations (indexed clips)",
    intro:
      "Retrieval-augmented generation and embedding-heavy explanations pulled from the public transcript index. " +
      "These are heuristic picks from spoken tutorials and courses — not verified research claims.",
    momentIds: ["cd9083c6855cce37372c", "316dd64bebbb09ae751a", "d8860ac1a4752a42aaca", "225a6bc5b10e893a1523"],
    relatedTopicSlugs: ["transformers", "kubernetes-beginners"],
    relatedSearches: ["what is rag", "vector database", "large language models"],
  },
  {
    slug: "kubernetes-explained",
    title: "Kubernetes explained — beginner + technical clips",
    intro:
      "Mixed-depth Kubernetes moments from indexed long-form tutorials. Compare how different creators introduce " +
      "orchestration concepts before jumping to a full course.",
    momentIds: ["a53098de8ff9cdb658b4", "e694fd85beb06e10ca2e"],
    relatedTopicSlugs: ["docker-devops", "kubernetes-beginners"],
    relatedSearches: ["kubernetes", "docker", "devops"],
  },
  {
    slug: "anthropic-ai-safety",
    title: "Anthropic, labs, and AI scaling context",
    intro:
      "Podcast and interview clips referencing Anthropic and lab economics. Source labels flag commentary vs. tutorials — " +
      "listen to the full segment before citing.",
    momentIds: ["f4ecb88fe4de2a7ee4cc", "225a6bc5b10e893a1523", "316dd64bebbb09ae751a"],
    relatedTopicSlugs: ["dylan-patel-compute", "china-energy-agi"],
    relatedSearches: ["artificial intelligence", "ai agents", "large language models"],
  },
  {
    slug: "startup-advice",
    title: "Startup, CapEx, and operator podcasts",
    intro:
      "High-signal business and infrastructure discussions from indexed interviews. Heuristic grouping — not personalized advice.",
    momentIds: ["8965986b1e48e1973877", "03c4d28eda37801c8041", "f4ecb88fe4de2a7ee4cc"],
    relatedTopicSlugs: ["dylan-patel-compute", "kubernetes-beginners"],
    relatedSearches: ["startup advice", "product market fit", "fundraising"],
  },
  {
    slug: "typescript-explanations",
    title: "TypeScript explanations",
    intro:
      "Beginner-friendly TypeScript course intros and adjacent JavaScript context from the same indexed uploads.",
    momentIds: ["fcfe6963ae05454f29e6", "6122aa297dd5e3caf747"],
    relatedTopicSlugs: ["typescript-course", "javascript"],
    relatedSearches: ["typescript", "javascript", "react hooks"],
  },
];

export function listCollectionSlugs() {
  return STATIC_PUBLIC_COLLECTIONS.map((c) => c.slug);
}

export function getStaticCollectionBySlug(slug: string): StaticPublicCollection | undefined {
  return STATIC_PUBLIC_COLLECTIONS.find((c) => c.slug === slug);
}

export function resolveCollectionMoments(collection: StaticPublicCollection): PublicMomentRecord[] {
  const out: PublicMomentRecord[] = [];
  for (const id of collection.momentIds) {
    const row = getPublicMomentById(id);
    if (row) out.push(row);
  }
  return out;
}
