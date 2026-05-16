/**
 * Allowed `targetTopics` values for Wave 1 candidates (ingestion planning + validation).
 * Derived from current corpus topic slugs and Wave 1 priority themes.
 */
export const WAVE1_TARGET_TOPICS = [
  "kubernetes-beginners",
  "docker-devops",
  "machine-learning",
  "transformers",
  "llm-fine-tuning",
  "how-llms-trained",
  "state-of-ai-2026",
  "backend-python",
  "backend-development",
  "flask-tutorial",
  "python-web-frameworks",
  "citation-rich-talks",
  "devops-practice",
  "kubernetes-comparison-depth",
  "ml-paper-walkthroughs",
  "hf-transformers-topic",
  "reinforcement-learning",
  "robotics-agents",
  "ai-policy-scaling",
  "university-lectures-ai",
  "university-lectures-ml",
  "conference-architecture",
  "conference-microservices",
  "conference-plenary-future",
  "startup-ideas-products",
  "startup-teams-execution",
  "startup-strategy",
  "founder-operator-commentary",
] as const;

export type Wave1TargetTopic = (typeof WAVE1_TARGET_TOPICS)[number];

export const WAVE1_TARGET_TOPIC_SET = new Set<string>(WAVE1_TARGET_TOPICS);
