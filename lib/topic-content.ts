import {
  formatTopicLabel,
  getRelatedTopics,
  getTopicBySlug,
  TOPIC_CLUSTER_LABELS,
  type TopicCluster,
  type TopicRecord,
} from "@/lib/topic-keywords";

export type TopicFaq = {
  question: string;
  answer: string;
};

export type TopicContent = {
  label: string;
  clusterLabel: string;
  intro: string;
  explanation: string;
  useCases: string[];
  faqs: TopicFaq[];
  popularSearches: string[];
  relatedPhrases: string[];
  alsoSearchFor: string[];
  relatedTopics: string[];
};

type ClusterContentTemplate = {
  intro: (topic: TopicRecord) => string;
  explanation: (topic: TopicRecord) => string;
  useCases: (topic: TopicRecord) => string[];
  relatedPhrases: (topic: TopicRecord) => string[];
};

const CLUSTER_CONTENT: Record<TopicCluster, ClusterContentTemplate> = {
  "youtube-transcript-search": {
    intro: (topic) =>
      `Search YouTube transcripts for ${topic.displayName.toLowerCase()} — find exact captions, quotes, and timestamped moments without scrubbing.`,
    explanation: (topic) =>
      `Use transcript search when you need ${topic.displayName.toLowerCase()} inside long uploads. Paste a YouTube URL, match the phrase in captions, and open the exact second where it appears.`,
    useCases: (topic) => [
      `Find quotable ${topic.displayName.toLowerCase()} lines inside interviews and panels`,
      `Jump to ${topic.displayName.toLowerCase()} mentions in lectures without watching the full video`,
      `Build shareable timestamp links for ${topic.displayName.toLowerCase()} results`,
      `Search multiple videos for recurring ${topic.displayName.toLowerCase()} themes`,
      `Skip manual caption scanning when hunting ${topic.displayName.toLowerCase()} moments`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} caption search`,
      `${topic.displayName} quote timestamp`,
      `best ${topic.slug.replace(/-/g, " ")} moments`,
      `${topic.displayName} transcript finder`,
      `search ${topic.slug.replace(/-/g, " ")} in video`,
    ],
  },
  podcasts: {
    intro: (topic) =>
      `Search podcast transcripts on YouTube for ${topic.displayName.toLowerCase()} clips, guest quotes, and episode highlights.`,
    explanation: (topic) =>
      `Long podcast uploads are painful to scrub. Transcript search helps you locate ${topic.displayName.toLowerCase()} segments, pull interview quotes, and share timestamped clip pages instantly.`,
    useCases: (topic) => [
      `Find ${topic.displayName.toLowerCase()} clips for social posts and newsletters`,
      `Jump to guest answers about ${topic.displayName.toLowerCase()} in multi-hour episodes`,
      `Search episode transcripts for recurring ${topic.displayName.toLowerCase()} themes`,
      `Bookmark ${topic.displayName.toLowerCase()} moments to revisit later`,
      `Build a library of ${topic.displayName.toLowerCase()} quotes with direct timestamps`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} best moments`,
      `${topic.displayName} guest quotes`,
      `${topic.displayName} episode search`,
      `clip ${topic.slug.replace(/-/g, " ")} podcast`,
      `${topic.displayName} highlight reel`,
    ],
  },
  "creator-business": {
    intro: (topic) =>
      `Find ${topic.displayName.toLowerCase()} advice, interviews, and strategy clips inside YouTube business content.`,
    explanation: (topic) =>
      `Creators and founders talk about ${topic.displayName.toLowerCase()} across podcasts, keynotes, and panels. Search transcripts to extract startup lessons, marketing tactics, and operator playbooks fast.`,
    useCases: (topic) => [
      `Pull ${topic.displayName.toLowerCase()} quotes from founder interviews`,
      `Find ${topic.displayName.toLowerCase()} strategy segments in startup school lectures`,
      `Search sales and marketing talks for ${topic.displayName.toLowerCase()} frameworks`,
      `Jump to ${topic.displayName.toLowerCase()} case studies in long business podcasts`,
      `Share timestamped ${topic.displayName.toLowerCase()} advice with your team`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} founder advice`,
      `${topic.displayName} growth tactics`,
      `${topic.displayName} interview clips`,
      `startup ${topic.slug.replace(/-/g, " ")} tips`,
      `${topic.displayName} operator playbook`,
    ],
  },
  productivity: {
    intro: (topic) =>
      `Search YouTube transcripts for ${topic.displayName.toLowerCase()} systems, routines, and focus advice from coaches and educators.`,
    explanation: (topic) =>
      `Productivity content spreads across podcasts, lectures, and coaching videos. Transcript search surfaces ${topic.displayName.toLowerCase()} frameworks so you can jump to the explanation instead of guessing timestamps.`,
    useCases: (topic) => [
      `Find ${topic.displayName.toLowerCase()} routines mentioned in morning habit videos`,
      `Locate ${topic.displayName.toLowerCase()} frameworks in long self-improvement podcasts`,
      `Search lectures for ${topic.displayName.toLowerCase()} study and work strategies`,
      `Bookmark ${topic.displayName.toLowerCase()} advice for weekly review`,
      `Compare how different creators explain ${topic.displayName.toLowerCase()}`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} daily routine`,
      `${topic.displayName} focus system`,
      `${topic.displayName} habit stack`,
      `how to improve ${topic.slug.replace(/-/g, " ")}`,
      `${topic.displayName} deep work tips`,
    ],
  },
  "health-fitness": {
    intro: (topic) =>
      `Find ${topic.displayName.toLowerCase()} discussions in health podcasts, clinician interviews, and evidence-based lectures on YouTube.`,
    explanation: (topic) =>
      `Health content mixes podcasts, conference talks, and explainer videos. Search transcripts to locate ${topic.displayName.toLowerCase()} protocols, research summaries, and practical guidance with exact timestamps.`,
    useCases: (topic) => [
      `Jump to ${topic.displayName.toLowerCase()} protocol explanations in science podcasts`,
      `Find ${topic.displayName.toLowerCase()} evidence discussions in university lectures`,
      `Search wellness interviews for ${topic.displayName.toLowerCase()} practical tips`,
      `Bookmark ${topic.displayName.toLowerCase()} segments to compare sources`,
      `Share timestamped ${topic.displayName.toLowerCase()} clips with accountability partners`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} science explained`,
      `${topic.displayName} doctor interview`,
      `${topic.displayName} wellness podcast`,
      `evidence for ${topic.slug.replace(/-/g, " ")}`,
      `${topic.displayName} routine guide`,
    ],
  },
  psychology: {
    intro: (topic) =>
      `Search psychology and mindset content for ${topic.displayName.toLowerCase()} explanations, coping strategies, and interview moments.`,
    explanation: (topic) =>
      `Psychology shows up in therapy podcasts, academic lectures, and self-help interviews. Transcript search helps you find where experts discuss ${topic.displayName.toLowerCase()} and open the exact segment instantly.`,
    useCases: (topic) => [
      `Find ${topic.displayName.toLowerCase()} explanations in neuroscience lectures`,
      `Locate ${topic.displayName.toLowerCase()} coping advice in coaching podcasts`,
      `Search interviews for ${topic.displayName.toLowerCase()} personal stories`,
      `Bookmark ${topic.displayName.toLowerCase()} segments for therapy homework`,
      `Compare clinical and popular takes on ${topic.displayName.toLowerCase()}`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} explained simply`,
      `${topic.displayName} therapy tips`,
      `${topic.displayName} neuroscience clip`,
      `understanding ${topic.slug.replace(/-/g, " ")}`,
      `${topic.displayName} interview advice`,
    ],
  },
  "ai-software": {
    intro: (topic) =>
      `Search coding tutorials, AI demos, and engineering lectures for ${topic.displayName.toLowerCase()} walkthroughs and explanations.`,
    explanation: (topic) =>
      `Developer content is dense and fast-paced. Transcript search helps you find ${topic.displayName.toLowerCase()} lessons, debugging steps, and course explanations without rewatching entire tutorials.`,
    useCases: (topic) => [
      `Jump to ${topic.displayName.toLowerCase()} code explanations in long tutorials`,
      `Find ${topic.displayName.toLowerCase()} debugging walkthroughs in engineering talks`,
      `Search conference lectures for ${topic.displayName.toLowerCase()} architecture patterns`,
      `Locate ${topic.displayName.toLowerCase()} setup steps in course modules`,
      `Share timestamped ${topic.displayName.toLowerCase()} references with your team`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} tutorial transcript`,
      `${topic.displayName} crash course`,
      `${topic.displayName} project walkthrough`,
      `learn ${topic.slug.replace(/-/g, " ")} fast`,
      `${topic.displayName} debugging tips`,
    ],
  },
  "money-investing": {
    intro: (topic) =>
      `Find ${topic.displayName.toLowerCase()} advice, market commentary, and wealth-building interviews in finance YouTube content.`,
    explanation: (topic) =>
      `Investing discussions appear in podcasts, shareholder meetings, and finance breakdowns. Search transcripts to extract ${topic.displayName.toLowerCase()} principles and jump to the exact quote or chart explanation.`,
    useCases: (topic) => [
      `Find ${topic.displayName.toLowerCase()} principles in investor interviews`,
      `Search market commentary for ${topic.displayName.toLowerCase()} risk discussions`,
      `Jump to ${topic.displayName.toLowerCase()} strategy segments in finance podcasts`,
      `Bookmark ${topic.displayName.toLowerCase()} explanations for portfolio review`,
      `Share timestamped ${topic.displayName.toLowerCase()} clips with study groups`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} portfolio advice`,
      `${topic.displayName} market breakdown`,
      `${topic.displayName} beginner guide`,
      `how to start ${topic.slug.replace(/-/g, " ")}`,
      `${topic.displayName} long-term strategy`,
    ],
  },
  "education-lecture": {
    intro: (topic) =>
      `Search lecture and course transcripts for ${topic.displayName.toLowerCase()} explanations, examples, and study anchors.`,
    explanation: (topic) =>
      `Students and lifelong learners use transcript search to find where instructors explain ${topic.displayName.toLowerCase()} in long classes. Open the exact timestamp for revision instead of scrubbing manually.`,
    useCases: (topic) => [
      `Find ${topic.displayName.toLowerCase()} definitions inside university lectures`,
      `Jump to ${topic.displayName.toLowerCase()} worked examples in online courses`,
      `Search exam prep videos for ${topic.displayName.toLowerCase()} problem walkthroughs`,
      `Build ${topic.displayName.toLowerCase()} study playlists from transcript matches`,
      `Share timestamped ${topic.displayName.toLowerCase()} explanations with classmates`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} lecture notes`,
      `${topic.displayName} course summary`,
      `${topic.displayName} exam topic`,
      `learn ${topic.slug.replace(/-/g, " ")} step by step`,
      `${topic.displayName} professor explanation`,
    ],
  },
  "popular-creator": {
    intro: (topic) =>
      `Search ${topic.displayName} interviews, podcasts, and clips on YouTube to find quotes, debates, and timestamped moments.`,
    explanation: (topic) =>
      `${topic.displayName} uploads span long interviews, lectures, and highlight channels. Transcript search lets you find the exact segment about any topic and share a direct timestamp link.`,
    useCases: (topic) => [
      `Find the best ${topic.displayName} quotes for clips and posts`,
      `Jump to guest answers in long ${topic.displayName} interview uploads`,
      `Search ${topic.displayName} episodes for a specific keyword or debate`,
      `Bookmark ${topic.displayName} moments to revisit later`,
      `Build shareable ${topic.displayName} timestamp pages from transcript matches`,
    ],
    relatedPhrases: (topic) => [
      `${topic.displayName} best moments`,
      `${topic.displayName} podcast search`,
      `${topic.displayName} interview highlights`,
      `find quote from ${topic.displayName}`,
      `${topic.displayName} clip timestamp`,
    ],
  },
};

function buildFaqs(topic: TopicRecord): TopicFaq[] {
  const label = topic.displayName.toLowerCase();
  const clusterLabel = TOPIC_CLUSTER_LABELS[topic.cluster].toLowerCase();

  return [
    {
      question: `How do I search YouTube transcripts for ${label}?`,
      answer: `Paste a YouTube video URL, enter a phrase related to ${label}, and open the exact timestamp where it appears in the transcript.`,
    },
    {
      question: `Can I find ${label} quotes in ${clusterLabel} videos?`,
      answer: `Yes. When captions are available, transcript search locates ${label} mentions and gives you a direct timestamp link.`,
    },
    {
      question: `Does this work for long ${clusterLabel} uploads about ${label}?`,
      answer: `Yes. Transcript search is built for long-form videos where manual scrubbing is slow and imprecise.`,
    },
    {
      question: `Can I share a ${label} transcript result?`,
      answer: `Yes. Result and topic pages are bookmarkable so you can return to the same moment or share it with others.`,
    },
  ];
}

function buildAlsoSearchFor(keyword: string) {
  return getRelatedTopics(keyword, 5).map((topic) => `${formatTopicLabel(topic)} transcript search`);
}

export function buildTopicContent(keyword: string): TopicContent {
  const topic = getTopicBySlug(keyword);
  const label = formatTopicLabel(keyword);
  const cluster = topic?.cluster ?? "youtube-transcript-search";
  const template = CLUSTER_CONTENT[cluster];

  const resolvedTopic: TopicRecord =
    topic ??
    ({
      slug: keyword,
      displayName: label,
      cluster,
      description: `Search YouTube transcripts for ${label.toLowerCase()} moments.`,
      relatedTopics: getRelatedTopics(keyword, 8),
      searchPhrases: [],
    } satisfies TopicRecord);

  return {
    label: resolvedTopic.displayName,
    clusterLabel: TOPIC_CLUSTER_LABELS[cluster],
    intro: template.intro(resolvedTopic),
    explanation: template.explanation(resolvedTopic),
    useCases: template.useCases(resolvedTopic),
    faqs: buildFaqs(resolvedTopic),
    popularSearches:
      resolvedTopic.searchPhrases.length > 0
        ? resolvedTopic.searchPhrases
        : [`${label} transcript search`, `find ${keyword} in youtube video`],
    relatedPhrases: template.relatedPhrases(resolvedTopic),
    alsoSearchFor: buildAlsoSearchFor(keyword),
    relatedTopics: getRelatedTopics(keyword, 8),
  };
}
