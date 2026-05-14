export const TRANSCRIPT_CATEGORY_SLUGS = [
  "programming-tutorials",
  "ai-podcasts",
  "business-interviews",
  "finance-education",
  "self-improvement",
] as const;

export type TranscriptCategorySlug = (typeof TRANSCRIPT_CATEGORY_SLUGS)[number];

export type TranscriptCategory = {
  slug: TranscriptCategorySlug;
  label: string;
  shortLabel: string;
  description: string;
  h1: string;
  intro: string;
  explanation: string;
  popularSearches: string[];
  relatedTopics: string[];
  relatedCreators: string[];
  defaultSearchPhrase: string;
};

export const TRANSCRIPT_CATEGORY_DATABASE: TranscriptCategory[] = [
  {
    slug: "programming-tutorials",
    label: "Programming tutorials",
    shortLabel: "Programming",
    description:
      "Browse indexed programming tutorial transcripts — JavaScript, Python, React, and coding walkthroughs with searchable timestamps.",
    h1: "Programming tutorial transcript search",
    intro:
      "Find exact moments inside coding tutorials without scrubbing. Search JavaScript, Python, web dev, and software engineering lessons by keyword.",
    explanation:
      "Programming tutorials move fast. Search the transcript to jump to setup steps, debugging tips, framework explanations, and copy-paste moments.",
    popularSearches: ["javascript", "python", "react", "typescript", "api"],
    relatedTopics: ["coding", "javascript", "web-development", "python-programming"],
    relatedCreators: ["freecodecamp", "fireship"],
    defaultSearchPhrase: "javascript tutorial",
  },
  {
    slug: "ai-podcasts",
    label: "AI podcasts",
    shortLabel: "AI podcasts",
    description:
      "Discover indexed AI podcast transcripts — model releases, research debates, and founder interviews with timestamp search.",
    h1: "AI podcast transcript search",
    intro:
      "Search long-form AI conversations for model capabilities, safety debates, startup strategy, and research takeaways.",
    explanation:
      "AI podcasts pack dense ideas into multi-hour episodes. Search transcripts to revisit a guest quote, paper reference, or product launch moment.",
    popularSearches: ["openai", "llm", "agents", "scaling laws", "alignment"],
    relatedTopics: ["ai", "machine-learning", "chatgpt", "startup"],
    relatedCreators: ["lex-fridman", "all-in-podcast", "chamath"],
    defaultSearchPhrase: "artificial intelligence",
  },
  {
    slug: "business-interviews",
    label: "Business interviews",
    shortLabel: "Business",
    description:
      "Search indexed business interview transcripts — founder stories, GTM lessons, and leadership conversations on YouTube.",
    h1: "Business interview transcript search",
    intro:
      "Jump to the exact quote inside founder interviews, operator breakdowns, and startup advice episodes.",
    explanation:
      "Business interviews are full of frameworks and war stories. Search transcripts to find customer discovery, hiring, fundraising, and growth tactics.",
    popularSearches: ["startup", "founder", "marketing", "leadership", "customers"],
    relatedTopics: ["startup", "entrepreneurship", "marketing", "leadership"],
    relatedCreators: ["diary-of-a-ceo", "yc-startup-school"],
    defaultSearchPhrase: "startup advice",
  },
  {
    slug: "finance-education",
    label: "Finance education",
    shortLabel: "Finance",
    description:
      "Browse indexed finance education transcripts — investing principles, markets, personal finance, and economic explainers.",
    h1: "Finance education transcript search",
    intro:
      "Search finance lessons and market explainers for portfolio rules, macro concepts, and personal finance frameworks.",
    explanation:
      "Finance education videos repeat key principles across long lectures. Search transcripts to return to definitions, examples, and actionable rules.",
    popularSearches: ["investing", "stocks", "index funds", "inflation", "budget"],
    relatedTopics: ["investing", "personal-finance", "money", "stocks"],
    relatedCreators: ["graham-stephan", "ray-dalio", "the-plain-bag"],
    defaultSearchPhrase: "investing basics",
  },
  {
    slug: "self-improvement",
    label: "Self-improvement",
    shortLabel: "Self-improvement",
    description:
      "Search indexed self-improvement podcast transcripts — habits, focus, sleep, productivity, and performance protocols.",
    h1: "Self-improvement podcast transcript search",
    intro:
      "Find protocol details, habit frameworks, and neuroscience explanations inside self-improvement podcasts and lectures.",
    explanation:
      "Self-improvement content is easier to apply when you can jump back to the exact protocol step. Search transcripts for sleep, focus, dopamine, and routine guidance.",
    popularSearches: ["habits", "focus", "sleep", "productivity", "discipline"],
    relatedTopics: ["productivity", "habits", "sleep", "focus"],
    relatedCreators: ["andrew-huberman", "tim-ferriss"],
    defaultSearchPhrase: "morning routine",
  },
];

const CATEGORY_BY_SLUG = new Map(
  TRANSCRIPT_CATEGORY_DATABASE.map((category) => [category.slug, category])
);

export function normalizeCategorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isTranscriptCategorySlug(slug: string): slug is TranscriptCategorySlug {
  return TRANSCRIPT_CATEGORY_SLUGS.includes(slug as TranscriptCategorySlug);
}

export function getTranscriptCategoryBySlug(slug: string): TranscriptCategory | undefined {
  const normalized = normalizeCategorySlug(slug);
  return isTranscriptCategorySlug(normalized) ? CATEGORY_BY_SLUG.get(normalized) : undefined;
}

export function getAllTranscriptCategories(): TranscriptCategory[] {
  return TRANSCRIPT_CATEGORY_DATABASE;
}
