/** Priority long-tail queries pre-rendered at build time for /search/[query]. */

export type SearchQuerySeed = {
  slug: string;
  phrase: string;
  title?: string;
  description?: string;
};

export const PRIORITY_SEARCH_QUERIES: SearchQuerySeed[] = [
  { slug: "what-is-rag", phrase: "what is rag", title: "What is RAG — video moments" },
  { slug: "how-to-learn-python", phrase: "how to learn python", title: "How to learn Python — video moments" },
  { slug: "ai-agents", phrase: "ai agents", title: "AI agents — video moments" },
  { slug: "machine-learning", phrase: "machine learning" },
  { slug: "large-language-models", phrase: "large language models" },
  { slug: "prompt-engineering", phrase: "prompt engineering" },
  { slug: "react-hooks", phrase: "react hooks" },
  { slug: "system-design", phrase: "system design" },
  { slug: "startup-advice", phrase: "startup advice" },
  { slug: "deep-work", phrase: "deep work" },
  { slug: "neural-networks", phrase: "neural networks" },
  { slug: "transformers", phrase: "transformers" },
  { slug: "kubernetes", phrase: "kubernetes" },
  { slug: "docker", phrase: "docker" },
  { slug: "javascript", phrase: "javascript" },
  { slug: "typescript", phrase: "typescript" },
  { slug: "python-tutorial", phrase: "python tutorial" },
  { slug: "product-market-fit", phrase: "product market fit" },
  { slug: "fundraising", phrase: "fundraising" },
  { slug: "sleep", phrase: "sleep" },
  { slug: "dopamine", phrase: "dopamine" },
  { slug: "focus", phrase: "focus" },
  { slug: "artificial-intelligence", phrase: "artificial intelligence" },
  { slug: "open-source", phrase: "open source" },
  { slug: "vector-database", phrase: "vector database" },
  { slug: "fine-tuning", phrase: "fine tuning" },
  { slug: "reinforcement-learning", phrase: "reinforcement learning" },
  { slug: "graphql", phrase: "graphql" },
  { slug: "nextjs", phrase: "nextjs" },
  { slug: "saas-pricing", phrase: "saas pricing" },
];

export const SEARCH_QUERY_SLUGS = PRIORITY_SEARCH_QUERIES.map((q) => q.slug);

export function getSearchQuerySeed(slug: string): SearchQuerySeed | undefined {
  const normalized = slug.trim().toLowerCase();
  return PRIORITY_SEARCH_QUERIES.find((q) => q.slug === normalized);
}

export function phraseFromSearchSlug(slug: string): string {
  return getSearchQuerySeed(slug)?.phrase ?? slug.replace(/-/g, " ");
}
