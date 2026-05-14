import {
  type CreatorCategory,
  type CreatorRecord,
  getCreatorBySlug,
  CREATOR_CATEGORY_LABELS,
} from "@/lib/creator-data";

export type CreatorFaq = {
  question: string;
  answer: string;
};

export type CreatorContent = {
  displayName: string;
  categoryLabel: string;
  h1: string;
  intro: string;
  explanation: string;
  popularSearches: string[];
  searchableTopics: string[];
  commonQueries: string[];
  relatedCreators: string[];
  faqs: CreatorFaq[];
};

type CategoryCopy = {
  h1: (c: CreatorRecord) => string;
  intro: (c: CreatorRecord) => string;
  explanation: (c: CreatorRecord) => string;
  commonQueries: (c: CreatorRecord) => string[];
};

const CATEGORY_COPY: Record<CreatorCategory, CategoryCopy> = {
  podcasts: {
    h1: (c) => `Search ${c.displayName} podcast transcripts`,
    intro: (c) =>
      `Find ${c.displayName} interview quotes, guest moments, and episode highlights without scrubbing multi-hour uploads on YouTube.`,
    explanation: (c) =>
      `Long podcast episodes make manual searching painful. Paste a ${c.displayName} YouTube URL, search the transcript, and jump to the exact timestamp for any guest, topic, or quote.`,
    commonQueries: (c) => [
      `${c.displayName} best quotes`,
      `${c.displayName} guest interview`,
      `${c.displayName} debate moment`,
      `${c.displayName} episode highlight`,
      `${c.displayName} funny moment`,
    ],
  },
  business: {
    h1: (c) => `Find ${c.displayName} business interview timestamps`,
    intro: (c) =>
      `Search ${c.displayName} talks, keynotes, and podcasts for strategy clips, sales advice, and operator playbooks.`,
    explanation: (c) =>
      `Business content is scattered across interviews, panels, and course uploads. Transcript search helps you pull ${c.displayName} advice on growth, offers, and leadership with shareable timestamps.`,
    commonQueries: (c) => [
      `${c.displayName} sales advice`,
      `${c.displayName} marketing strategy`,
      `${c.displayName} scaling business`,
      `${c.displayName} founder story`,
      `${c.displayName} keynote clip`,
    ],
  },
  ai: {
    h1: (c) => `Search ${c.displayName} AI transcripts and timestamps`,
    intro: (c) =>
      `Locate ${c.displayName} AI demos, model discussions, and technical explanations inside YouTube lectures and interviews.`,
    explanation: (c) =>
      `AI videos move fast. Search ${c.displayName} transcripts to find definitions, benchmarks, safety debates, and tool walkthroughs without rewatching entire streams.`,
    commonQueries: (c) => [
      `${c.displayName} AGI discussion`,
      `${c.displayName} model review`,
      `${c.displayName} AI safety`,
      `${c.displayName} coding demo`,
      `${c.displayName} future of AI`,
    ],
  },
  health: {
    h1: (c) => `Find ${c.displayName} health protocol timestamps`,
    intro: (c) =>
      `Search ${c.displayName} podcasts and lectures for longevity, sleep, nutrition, and evidence-based health discussions.`,
    explanation: (c) =>
      `Health protocols are easier to revisit when you can search them. Use transcript search on ${c.displayName} uploads to jump to supplement stacks, study summaries, and clinician interviews.`,
    commonQueries: (c) => [
      `${c.displayName} longevity protocol`,
      `${c.displayName} sleep advice`,
      `${c.displayName} nutrition science`,
      `${c.displayName} supplement discussion`,
      `${c.displayName} exercise recovery`,
    ],
  },
  fitness: {
    h1: (c) => `Search ${c.displayName} fitness video transcripts`,
    intro: (c) =>
      `Find ${c.displayName} training cues, program breakdowns, and form corrections inside workout and coaching videos.`,
    explanation: (c) =>
      `Fitness tutorials repeat key cues across long videos. Search ${c.displayName} transcripts to jump to sets, progression rules, and technique notes instantly.`,
    commonQueries: (c) => [
      `${c.displayName} workout program`,
      `${c.displayName} form tips`,
      `${c.displayName} hypertrophy advice`,
      `${c.displayName} diet tips`,
      `${c.displayName} mobility routine`,
    ],
  },
  productivity: {
    h1: (c) => `Find ${c.displayName} productivity timestamps`,
    intro: (c) =>
      `Search ${c.displayName} videos for habit systems, study workflows, and focus frameworks with exact transcript matches.`,
    explanation: (c) =>
      `Productivity advice is dense. Transcript search on ${c.displayName} content helps you revisit routines, note-taking systems, and deep work tactics in seconds.`,
    commonQueries: (c) => [
      `${c.displayName} morning routine`,
      `${c.displayName} study system`,
      `${c.displayName} note taking`,
      `${c.displayName} deep work`,
      `${c.displayName} habit building`,
    ],
  },
  entrepreneurship: {
    h1: (c) => `Search ${c.displayName} startup interview transcripts`,
    intro: (c) =>
      `Find ${c.displayName} founder advice, fundraising lessons, and product strategy clips in startup podcasts and lectures.`,
    explanation: (c) =>
      `Startup interviews are long but quote-rich. Search ${c.displayName} transcripts to extract fundraising, hiring, and go-to-market timestamps you can share with your team.`,
    commonQueries: (c) => [
      `${c.displayName} fundraising advice`,
      `${c.displayName} product market fit`,
      `${c.displayName} YC lessons`,
      `${c.displayName} hiring founders`,
      `${c.displayName} pivot story`,
    ],
  },
  education: {
    h1: (c) => `Search ${c.displayName} lecture and tutorial transcripts`,
    intro: (c) =>
      `Jump to ${c.displayName} lesson explanations, worked examples, and course modules using YouTube transcript search.`,
    explanation: (c) =>
      `Educational uploads are perfect for transcript search. Find where ${c.displayName} explains a concept, walks through a problem, or summarizes a module without scanning the whole video.`,
    commonQueries: (c) => [
      `${c.displayName} lecture notes`,
      `${c.displayName} tutorial step`,
      `${c.displayName} exam topic`,
      `${c.displayName} problem walkthrough`,
      `${c.displayName} course summary`,
    ],
  },
  finance: {
    h1: (c) => `Find ${c.displayName} investing commentary timestamps`,
    intro: (c) =>
      `Search ${c.displayName} market breakdowns, portfolio advice, and personal finance lessons on YouTube.`,
    explanation: (c) =>
      `Finance videos mix macro commentary with practical advice. Transcript search helps you locate ${c.displayName} takes on assets, risk, and wealth-building with precise timestamps.`,
    commonQueries: (c) => [
      `${c.displayName} stock picks`,
      `${c.displayName} market outlook`,
      `${c.displayName} real estate advice`,
      `${c.displayName} budgeting tips`,
      `${c.displayName} portfolio strategy`,
    ],
  },
  tech: {
    h1: (c) => `Search ${c.displayName} tech review transcripts`,
    intro: (c) =>
      `Find ${c.displayName} product reviews, creator business breakdowns, and tech interview timestamps on YouTube.`,
    explanation: (c) =>
      `Tech and creator channels publish fast-moving reviews and behind-the-scenes uploads. Search ${c.displayName} transcripts to jump to comparisons, benchmarks, and business lessons.`,
    commonQueries: (c) => [
      `${c.displayName} product review`,
      `${c.displayName} camera test`,
      `${c.displayName} creator business`,
      `${c.displayName} channel growth`,
      `${c.displayName} tech interview`,
    ],
  },
};

function buildFaqs(creator: CreatorRecord): CreatorFaq[] {
  const name = creator.displayName;
  const category = CREATOR_CATEGORY_LABELS[creator.category].toLowerCase();
  return [
    {
      question: `How do I search ${name} transcripts on YouTube?`,
      answer: `Paste a ${name} YouTube video URL, enter your keyword, and open the exact caption match with a timestamp link.`,
    },
    {
      question: `Can I find ${name} quotes without watching full videos?`,
      answer: `Yes. Transcript search is built for long ${category} uploads where manual scrubbing is slow.`,
    },
    {
      question: `Does this work for ${name} podcast clips on YouTube?`,
      answer: `If the upload has searchable captions, you can locate quotes and share the timestamp instantly.`,
    },
    {
      question: `Can I search multiple topics inside ${name} videos?`,
      answer: `Yes. Run separate transcript searches for different keywords across the same or different ${name} uploads.`,
    },
  ];
}

export function buildCreatorContent(slug: string): CreatorContent | null {
  const creator = getCreatorBySlug(slug);
  if (!creator) return null;

  const copy = CATEGORY_COPY[creator.category];

  return {
    displayName: creator.displayName,
    categoryLabel: CREATOR_CATEGORY_LABELS[creator.category],
    h1: copy.h1(creator),
    intro: copy.intro(creator),
    explanation: copy.explanation(creator),
    popularSearches: creator.searchIntentPhrases,
    searchableTopics: creator.popularTopics,
    commonQueries: copy.commonQueries(creator),
    relatedCreators: creator.relatedCreators,
    faqs: buildFaqs(creator),
  };
}
