/**
 * High-signal topic registry — 50–100 research-grade topics (governance only).
 * Optimized for trust density and compare depth, not SEO volume.
 */

import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

export type HighSignalVertical =
  | "ai_ml"
  | "devops"
  | "frontend"
  | "startups"
  | "safety_eval"
  | "education";

export type HighSignalTrustRequirements = {
  minIndexedVideos: number;
  minUniqueCreators: number;
  /** Share of matched moments that are citation-rich (0–1). */
  minCitationDensity: number;
  /** Distinct compare-explanation rows (creator/video diversity). */
  minCompareDepth: number;
  /** Distinct source-authority labels. */
  minSourceDiversity: number;
  /** Share of moments labeled primary_source or academic_technical (0–1). */
  minPrimarySourceCoverage: number;
  /** Share with semantic extraction kinds (0–1). */
  minSemanticExplanationRatio: number;
};

export type HighSignalTopicDefinition = {
  canonicalSlug: string;
  label: string;
  primaryQuery: string;
  aliases: string[];
  vertical: HighSignalVertical;
  topicHubSlugs: string[];
  requirements: HighSignalTrustRequirements;
};

/** Default research-grade trust bar for curated high-signal topics. */
export const HIGH_SIGNAL_DEFAULT_REQUIREMENTS: HighSignalTrustRequirements = {
  minIndexedVideos: 2,
  minUniqueCreators: 2,
  minCitationDensity: 0.25,
  minCompareDepth: 2,
  minSourceDiversity: 2,
  minPrimarySourceCoverage: 0.15,
  minSemanticExplanationRatio: 0.2,
};

/** Stricter bar for elite-tier aspirational topics. */
export const HIGH_SIGNAL_ELITE_REQUIREMENTS: HighSignalTrustRequirements = {
  minIndexedVideos: 3,
  minUniqueCreators: 3,
  minCitationDensity: 0.4,
  minCompareDepth: 3,
  minSourceDiversity: 3,
  minPrimarySourceCoverage: 0.25,
  minSemanticExplanationRatio: 0.35,
};

function t(
  slug: string,
  label: string,
  primaryQuery: string,
  vertical: HighSignalVertical,
  aliases: string[] = [],
  topicHubSlugs: string[] = [],
  requirements: HighSignalTrustRequirements = HIGH_SIGNAL_DEFAULT_REQUIREMENTS
): HighSignalTopicDefinition {
  return {
    canonicalSlug: slug,
    label,
    primaryQuery,
    aliases,
    vertical,
    topicHubSlugs: [slug, ...topicHubSlugs],
    requirements,
  };
}

/** Curated registry (~60 seeds; expand toward 50–100 via aliases + hubs). */
export const HIGH_SIGNAL_TOPICS: HighSignalTopicDefinition[] = [
  // —— AI / ML core ——
  t("rag", "RAG (retrieval-augmented generation)", "what is rag", "ai_ml", [
    "retrieval augmented generation",
    "retrieval-augmented generation",
  ], ["transformers", "vector-database"]),
  t("vector-databases", "Vector databases", "vector database", "ai_ml", [
    "vector databases",
    "embedding store",
    "pinecone",
    "chroma db",
  ]),
  t("embeddings", "Embeddings", "embeddings explained", "ai_ml", [
    "text embeddings",
    "embedding models",
    "word2vec",
  ]),
  t("transformers", "Transformers", "transformer architecture", "ai_ml", [
    "attention is all you need",
    "transformer model",
  ]),
  t("inference", "LLM inference", "llm inference", "ai_ml", [
    "inference optimization",
    "model serving",
    "latency",
  ]),
  t("fine-tuning", "Fine-tuning", "fine tuning llm", "ai_ml", [
    "fine tuning",
    "lora",
    "peft",
    "instruction tuning",
  ]),
  t("context-windows", "Context windows", "context window llm", "ai_ml", [
    "long context",
    "context length",
    "token limit",
  ]),
  t("llm-evals", "LLM evaluation", "llm evals", "safety_eval", [
    "llm evaluation",
    "benchmark llm",
    "model evaluation",
  ], [], HIGH_SIGNAL_ELITE_REQUIREMENTS),
  t("ai-agents", "AI agents", "ai agents", "ai_ml", ["ai agent", "agentic ai", "autonomous agents"]),
  t("prompt-engineering", "Prompt engineering", "prompt engineering", "ai_ml", [
    "prompting",
    "llm prompts",
    "chain of thought",
  ]),
  t("large-language-models", "Large language models", "large language models", "ai_ml", [
    "llm",
    "language models",
    "gpt",
  ]),
  t("reinforcement-learning", "Reinforcement learning", "reinforcement learning", "ai_ml", [
    "rlhf",
    "reward model",
    "policy gradient",
  ]),
  t("attention-mechanism", "Attention mechanism", "attention mechanism", "ai_ml", [
    "self attention",
    "multi head attention",
  ]),
  t("neural-networks", "Neural networks", "neural networks explained", "ai_ml", [
    "deep learning basics",
    "neural net",
  ]),
  t("backpropagation", "Backpropagation", "backpropagation", "ai_ml", ["backprop", "gradient descent"]),
  t("gradient-descent", "Gradient descent", "gradient descent", "ai_ml", ["sgd", "adam optimizer"]),
  t("rag-chunking", "RAG chunking", "rag chunking strategy", "ai_ml", [
    "document chunking",
    "text splitting",
  ]),
  t("semantic-search", "Semantic search", "semantic search", "ai_ml", [
    "vector search",
    "similarity search",
  ]),
  t("hallucination-mitigation", "Hallucination mitigation", "llm hallucination", "ai_ml", [
    "reduce hallucinations",
    "grounding",
  ]),
  t("mixture-of-experts", "Mixture of experts", "mixture of experts", "ai_ml", ["moe", "sparse models"]),
  // —— Safety / eval ——
  t("ai-safety", "AI safety", "ai safety", "safety_eval", [
    "ai alignment",
    "ai risk",
    "existential risk",
  ], [], HIGH_SIGNAL_ELITE_REQUIREMENTS),
  t("ai-policy-scaling", "AI policy & scaling", "ai policy scaling", "safety_eval", [
    "frontier models",
    "compute governance",
  ]),
  t("red-teaming-llm", "Red teaming LLMs", "red teaming llm", "safety_eval", [
    "adversarial testing",
    "jailbreak",
  ]),
  t("model-guardrails", "Model guardrails", "llm guardrails", "safety_eval", [
    "safety filters",
    "content moderation",
  ]),
  // —— DevOps / systems ——
  t("kubernetes", "Kubernetes", "kubernetes explained", "devops", [
    "k8s",
    "kubernetes tutorial",
    "container orchestration",
  ], ["kubernetes-beginners", "docker-devops"]),
  t("kubernetes-scheduling", "Kubernetes scheduling", "kubernetes scheduling", "devops", [
    "pod scheduling",
    "k8s scheduler",
  ]),
  t("docker", "Docker", "docker containers", "devops", ["docker tutorial", "containerization"]),
  t("devops", "DevOps", "devops practices", "devops", ["ci cd", "continuous deployment"]),
  t("system-design", "System design", "system design interview", "devops", [
    "systems design",
    "scalability",
    "distributed systems",
  ]),
  t("distributed-systems", "Distributed systems", "distributed systems", "devops", [
    "consensus",
    "cap theorem",
    "replication",
  ]),
  t("microservices", "Microservices", "microservices architecture", "devops", [
    "service mesh",
    "api gateway",
  ]),
  t("observability", "Observability", "observability engineering", "devops", [
    "prometheus",
    "grafana",
    "distributed tracing",
  ]),
  t("terraform", "Terraform", "terraform tutorial", "devops", ["infrastructure as code", "iac"]),
  t("networking-fundamentals", "Networking fundamentals", "computer networking explained", "devops", [
    "tcp ip",
    "dns",
    "load balancing",
  ]),
  // —— Frontend / engineering ——
  t("react-hooks", "React hooks", "react hooks", "frontend", ["useState", "useEffect", "custom hooks"]),
  t("typescript", "TypeScript", "typescript tutorial", "frontend", ["type safety", "typescript types"]),
  t("javascript", "JavaScript", "javascript fundamentals", "frontend", ["js tutorial", "es6"]),
  t("nextjs", "Next.js", "nextjs tutorial", "frontend", ["next.js", "react server components"]),
  t("graphql", "GraphQL", "graphql explained", "frontend", ["apollo", "graphql api"]),
  t("state-management", "State management", "react state management", "frontend", [
    "redux",
    "zustand",
    "context api",
  ]),
  t("web-performance", "Web performance", "web performance optimization", "frontend", [
    "core web vitals",
    "lighthouse",
  ]),
  // —— Startups / strategy ——
  t("startup-strategy", "Startup strategy", "startup strategy", "startups", [
    "startup advice",
    "founder strategy",
  ]),
  t("product-market-fit", "Product-market fit", "product market fit", "startups", [
    "pmf",
    "customer discovery",
  ]),
  t("fundraising", "Fundraising", "startup fundraising", "startups", [
    "venture capital",
    "seed round",
    "pitch deck",
  ]),
  t("saas-pricing", "SaaS pricing", "saas pricing strategy", "startups", [
    "pricing model",
    "subscription pricing",
  ]),
  t("go-to-market", "Go-to-market", "go to market strategy", "startups", ["gtm", "sales strategy"]),
  t("competitive-moat", "Competitive moat", "competitive moat startup", "startups", [
    "defensibility",
    "network effects",
  ]),
  // —— Education / depth ——
  t("machine-learning", "Machine learning", "machine learning course", "education", [
    "ml fundamentals",
    "supervised learning",
  ]),
  t("statistics-for-ml", "Statistics for ML", "statistics for machine learning", "education", [
    "probability",
    "bayesian",
  ]),
  t("linear-algebra-ml", "Linear algebra for ML", "linear algebra machine learning", "education", [
    "matrices",
    "eigenvalues",
  ]),
  t("computer-vision", "Computer vision", "computer vision explained", "education", [
    "cnn",
    "image classification",
  ]),
  t("nlp-fundamentals", "NLP fundamentals", "natural language processing", "education", [
    "tokenization",
    "language models",
  ]),
  t("database-design", "Database design", "database design explained", "education", [
    "sql",
    "normalization",
    "schema design",
  ]),
  t("api-design", "API design", "rest api design", "education", ["restful", "api versioning"]),
  t("security-fundamentals", "Security fundamentals", "cybersecurity basics", "education", [
    "owasp",
    "encryption",
  ]),
  t("open-source-ai", "Open-source AI", "open source llm", "ai_ml", [
    "llama",
    "mistral",
    "open weights",
  ]),
  t("gpu-training", "GPU training", "gpu training deep learning", "ai_ml", [
    "cuda",
    "training throughput",
  ]),
  t("data-pipelines", "Data pipelines", "data pipeline architecture", "ai_ml", [
    "etl",
    "feature store",
  ]),
  t("rag-evaluation", "RAG evaluation", "rag evaluation metrics", "safety_eval", [
    "retrieval metrics",
    "faithfulness",
  ]),
  t("constitutional-ai", "Constitutional AI", "constitutional ai", "safety_eval", [
    "rlhf safety",
    "anthropic",
  ]),
  t("multimodal-models", "Multimodal models", "multimodal llm", "ai_ml", [
    "vision language",
    "clip",
  ]),
  t("quantization", "Quantization", "llm quantization", "ai_ml", [
    "int8",
    "gguf",
    "model compression",
  ]),
  t("agents-tool-use", "Agents & tool use", "llm tool use", "ai_ml", [
    "function calling",
    "tool calling",
  ]),
  t("memory-agents", "Agent memory", "ai agent memory", "ai_ml", [
    "long term memory",
    "agent state",
  ]),
];

export function listHighSignalTopics(): HighSignalTopicDefinition[] {
  return HIGH_SIGNAL_TOPICS;
}

export function getHighSignalTopicBySlug(slug: string): HighSignalTopicDefinition | undefined {
  const key = slug.trim().toLowerCase();
  return HIGH_SIGNAL_TOPICS.find((t) => t.canonicalSlug === key);
}

export function normalizeTopicText(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(q: string): string[] {
  return normalizeTopicText(q).split(" ").filter((tok) => tok.length > 1);
}

/** Match corpus moments to a high-signal topic definition. */
export function matchMomentsToHighSignalTopic(
  def: HighSignalTopicDefinition,
  moments: PublicMomentRecord[]
): PublicMomentRecord[] {
  const queries = [def.primaryQuery, ...def.aliases, def.canonicalSlug.replace(/-/g, " ")].map(
    normalizeTopicText
  );
  const hubSlugs = def.topicHubSlugs.map((s) => normalizeTopicText(s.replace(/-/g, " ")));

  return moments.filter((m) => {
    const topicSlug = normalizeTopicText(m.topic ?? "");
    if (topicSlug === def.canonicalSlug || def.topicHubSlugs.includes(topicSlug)) return true;

    const blob = normalizeTopicText(
      [m.topic, m.phrase, m.snippet, m.videoTitle, m.channelName].filter(Boolean).join(" ")
    );
    if (hubSlugs.some((h) => blob.includes(h))) return true;
    for (const q of queries) {
      if (!q) continue;
      if (blob.includes(q)) return true;
      const tokens = queryTokens(q);
      if (tokens.length >= 2 && tokens.every((tok) => blob.includes(tok))) return true;
    }
    return false;
  });
}
