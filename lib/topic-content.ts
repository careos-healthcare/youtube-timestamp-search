import { formatTopicLabel, getRelatedTopics } from "@/lib/topic-keywords";

export type TopicFaq = {
  question: string;
  answer: string;
};

export type TopicContent = {
  label: string;
  intro: string;
  explanation: string;
  useCases: string[];
  faqs: TopicFaq[];
  popularSearches: string[];
  relatedPhrases: string[];
  alsoSearchFor: string[];
  relatedTopics: string[];
};

function buildPopularSearches(keyword: string) {
  const label = formatTopicLabel(keyword);
  return [
    `${label} podcast transcript`,
    `${label} interview timestamp`,
    `find ${keyword} in youtube video`,
    `${keyword} quotes youtube`,
    `search ${keyword} transcript`,
    `${keyword} lecture moment`,
  ];
}

function buildRelatedPhrases(keyword: string) {
  const label = formatTopicLabel(keyword);
  return [
    `${label} advice`,
    `${label} tips`,
    `${label} explained`,
    `${label} motivation`,
    `${label} strategy`,
    `best ${keyword} moments`,
  ];
}

function buildAlsoSearchFor(keyword: string) {
  return getRelatedTopics(keyword, 5).map((topic) => `${topic} transcript search`);
}

function buildUseCases(keyword: string) {
  const label = formatTopicLabel(keyword);
  return [
    `Find ${label.toLowerCase()} quotes inside long podcast episodes`,
    `Jump to ${label.toLowerCase()} advice in interviews without scrubbing`,
    `Search lecture transcripts for ${label.toLowerCase()} explanations`,
    `Bookmark shareable ${label.toLowerCase()} timestamp pages`,
    `Discover recurring ${label.toLowerCase()} themes across YouTube videos`,
  ];
}

function buildFaqs(keyword: string): TopicFaq[] {
  const label = formatTopicLabel(keyword);
  return [
    {
      question: `How do I search YouTube transcripts for ${label.toLowerCase()}?`,
      answer: `Paste a YouTube video URL, enter "${keyword}", and open the exact timestamp where the topic appears in the transcript.`,
    },
    {
      question: `Can I find ${label.toLowerCase()} quotes in podcasts on YouTube?`,
      answer: `Yes. If the video exposes searchable captions, you can locate ${label.toLowerCase()} moments and jump directly to the right timestamp.`,
    },
    {
      question: `Does this work for long interviews and lectures about ${label.toLowerCase()}?`,
      answer: `Yes. Transcript search is especially useful for long-form videos where manual scrubbing is slow.`,
    },
    {
      question: `Can I share a ${label.toLowerCase()} transcript result?`,
      answer: `Yes. Result pages are bookmarkable and shareable so you can return to the same moment later.`,
    },
  ];
}

export function buildTopicContent(keyword: string): TopicContent {
  const label = formatTopicLabel(keyword);

  return {
    label,
    intro: `Search YouTube transcripts for ${label.toLowerCase()} moments, quotes, and podcast segments without scrubbing through long videos.`,
    explanation: `Use transcript search to find where creators, podcasters, and educators talk about ${label.toLowerCase()} inside YouTube videos. Instead of guessing timestamps, search the transcript and open the exact moment instantly.`,
    useCases: buildUseCases(keyword),
    faqs: buildFaqs(keyword),
    popularSearches: buildPopularSearches(keyword),
    relatedPhrases: buildRelatedPhrases(keyword),
    alsoSearchFor: buildAlsoSearchFor(keyword),
    relatedTopics: getRelatedTopics(keyword, 8),
  };
}
