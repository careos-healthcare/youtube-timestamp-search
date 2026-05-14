import { CREATOR_SEEDS } from "@/lib/creator-seeds";

export type CreatorCategory =
  | "podcasts"
  | "business"
  | "ai"
  | "health"
  | "fitness"
  | "productivity"
  | "entrepreneurship"
  | "education"
  | "finance"
  | "tech";

export type CreatorSeed = {
  slug: string;
  displayName: string;
  category: CreatorCategory;
  description: string;
  aliases: string[];
  popularTopics: string[];
  featured?: boolean;
};

export type CreatorRecord = CreatorSeed & {
  searchIntentPhrases: string[];
  relatedCreators: string[];
};

export const CREATOR_CATEGORY_LABELS: Record<CreatorCategory, string> = {
  podcasts: "Podcasts & interviews",
  business: "Business & marketing",
  ai: "AI & machine learning",
  health: "Health & longevity",
  fitness: "Fitness & training",
  productivity: "Productivity & habits",
  entrepreneurship: "Entrepreneurship & startups",
  education: "Education & tutorials",
  finance: "Finance & investing",
  tech: "Tech & creators",
};

export const CREATOR_CATEGORY_ORDER: CreatorCategory[] = [
  "podcasts",
  "business",
  "ai",
  "health",
  "fitness",
  "productivity",
  "entrepreneurship",
  "education",
  "finance",
  "tech",
];

const CATEGORY_SEARCH_TEMPLATES: Record<CreatorCategory, string[]> = {
  podcasts: [
    "{name} transcript search",
    "{name} podcast transcript",
    "{name} timestamps",
    "{name} quotes",
    "find {name} interview moment",
  ],
  business: [
    "{name} business advice transcript",
    "{name} interview timestamps",
    "{name} quotes youtube",
    "search {name} podcast",
    "{name} strategy clips",
  ],
  ai: [
    "{name} AI interview transcript",
    "{name} timestamps",
    "{name} lecture search",
    "find {name} AI quotes",
    "{name} demo timestamps",
  ],
  health: [
    "{name} health podcast transcript",
    "{name} protocol timestamps",
    "{name} interview search",
    "find {name} longevity quotes",
    "{name} science clips",
  ],
  fitness: [
    "{name} workout transcript",
    "{name} training timestamps",
    "{name} fitness quotes",
    "search {name} form tips",
    "{name} program clips",
  ],
  productivity: [
    "{name} productivity transcript",
    "{name} habits timestamps",
    "{name} advice search",
    "find {name} routine quotes",
    "{name} system clips",
  ],
  entrepreneurship: [
    "{name} startup interview transcript",
    "{name} founder timestamps",
    "{name} YC quotes",
    "search {name} business podcast",
    "{name} scaling advice",
  ],
  education: [
    "{name} lecture transcript",
    "{name} tutorial timestamps",
    "{name} course search",
    "find {name} lesson moment",
    "{name} explanation clips",
  ],
  finance: [
    "{name} investing transcript",
    "{name} market timestamps",
    "{name} finance quotes",
    "search {name} money advice",
    "{name} portfolio clips",
  ],
  tech: [
    "{name} tech review transcript",
    "{name} interview timestamps",
    "{name} product quotes",
    "search {name} youtube",
    "{name} creator business clips",
  ],
};

export const TOPIC_TO_CREATORS: Record<string, string[]> = {
  dopamine: ["andrew-huberman", "huberman-lab-clips", "joe-rogan"],
  ai: ["lex-fridman", "sam-altman", "andrej-karpathy"],
  chatgpt: ["sam-altman", "matt-wolfe", "fireship"],
  startup: ["yc-startup-school", "alex-hormozi", "paul-graham"],
  entrepreneurship: ["alex-hormozi", "gary-vee", "paul-graham"],
  saas: ["david-sacks", "elad-gil", "indie-hackers"],
  investing: ["warren-buffett", "ray-dalio", "chamath"],
  bitcoin: ["michael-saylor", "chamath"],
  money: ["naval-ravikant", "graham-stephan", "ramit-sethi"],
  productivity: ["ali-abdaal", "cal-newport", "thomas-frank"],
  habits: ["james-clear", "ali-abdaal", "mel-robbins"],
  focus: ["andrew-huberman", "cal-newport", "ali-abdaal"],
  sleep: ["andrew-huberman", "peter-attia", "rhonda-patrick"],
  fitness: ["jeff-nippard", "david-goggins", "chris-bumstead"],
  nutrition: ["peter-attia", "rhonda-patrick", "layne-norton"],
  psychology: ["joe-rogan", "andrew-huberman", "jordan-peterson"],
  coding: ["fireship", "freecodecamp", "theo-t3"],
  javascript: ["traversy-media", "fireship", "the-net-ninja"],
  python: ["sentdex", "freecodecamp"],
  react: ["traversy-media", "theo-t3", "the-net-ninja"],
  neuroscience: ["andrew-huberman", "lex-fridman"],
  discipline: ["david-goggins", "jocko-willink", "ryan-holiday"],
  marketing: ["alex-hormozi", "gary-vee", "russell-brunson"],
  "joe-rogan": ["joe-rogan"],
  "andrew-huberman": ["andrew-huberman"],
  "lex-fridman": ["lex-fridman"],
  "alex-hormozi": ["alex-hormozi"],
  "diary-of-a-ceo": ["diary-of-a-ceo"],
  "naval-ravikant": ["naval-ravikant"],
  "yc-startup-school": ["yc-startup-school"],
};

function applyTemplate(template: string, creator: CreatorSeed) {
  return template.replaceAll("{name}", creator.displayName);
}

function buildSearchIntentPhrases(creator: CreatorSeed): string[] {
  return CATEGORY_SEARCH_TEMPLATES[creator.category].map((template) =>
    applyTemplate(template, creator)
  );
}

function buildRelatedCreators(creator: CreatorSeed, all: CreatorRecord[]): string[] {
  const sameCategory = all
    .filter((c) => c.slug !== creator.slug && c.category === creator.category)
    .map((c) => c.slug);
  const featured = all
    .filter((c) => c.slug !== creator.slug && c.featured)
    .map((c) => c.slug);
  const merged = [...sameCategory, ...featured];
  const unique: string[] = [];
  for (const slug of merged) {
    if (!unique.includes(slug)) unique.push(slug);
    if (unique.length >= 8) break;
  }
  return unique;
}

function buildCreatorDatabase(seeds: CreatorSeed[]): CreatorRecord[] {
  const base = seeds.map((seed) => ({
    ...seed,
    searchIntentPhrases: buildSearchIntentPhrases(seed),
    relatedCreators: [] as string[],
  }));
  return base.map((creator) => ({
    ...creator,
    relatedCreators: buildRelatedCreators(creator, base),
  }));
}

export const CREATOR_DATABASE: CreatorRecord[] = buildCreatorDatabase(CREATOR_SEEDS);

export const CREATOR_BY_SLUG = new Map(CREATOR_DATABASE.map((c) => [c.slug, c]));

export const CREATOR_SLUGS = CREATOR_DATABASE.map((c) => c.slug);

export function normalizeCreatorSlug(slug: string) {
  return decodeURIComponent(slug).toLowerCase();
}

export function getCreatorBySlug(slug: string): CreatorRecord | undefined {
  return CREATOR_BY_SLUG.get(normalizeCreatorSlug(slug));
}

export function isCreatorSlug(slug: string): slug is (typeof CREATOR_SLUGS)[number] {
  return CREATOR_BY_SLUG.has(normalizeCreatorSlug(slug));
}

export function getCreatorsByCategory(category: CreatorCategory) {
  return CREATOR_DATABASE.filter((c) => c.category === category);
}

export function getCreatorsGroupedByCategory() {
  return CREATOR_CATEGORY_ORDER.map((category) => ({
    category,
    label: CREATOR_CATEGORY_LABELS[category],
    creators: getCreatorsByCategory(category),
  }));
}

export function getFeaturedCreators(limit = 18) {
  return CREATOR_DATABASE.filter((c) => c.featured).slice(0, limit);
}

export function getFeaturedCreatorsByCategory(limitPerCategory = 2) {
  return CREATOR_CATEGORY_ORDER.map((category) => ({
    category,
    label: CREATOR_CATEGORY_LABELS[category],
    creators: CREATOR_DATABASE.filter((c) => c.category === category && c.featured).slice(
      0,
      limitPerCategory
    ),
  })).filter((group) => group.creators.length > 0);
}

export function getCreatorsForTopic(topicSlug: string, limit = 6) {
  const mapped = TOPIC_TO_CREATORS[normalizeCreatorSlug(topicSlug)] ?? [];
  const resolved = mapped
    .map((slug) => getCreatorBySlug(slug))
    .filter((c): c is CreatorRecord => Boolean(c));
  if (resolved.length >= limit) return resolved.slice(0, limit);

  const featured = CREATOR_DATABASE.filter(
    (c) => c.featured && !resolved.some((r) => r.slug === c.slug)
  );
  return [...resolved, ...featured].slice(0, limit);
}
