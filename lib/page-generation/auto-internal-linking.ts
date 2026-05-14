import { buildInternalLinkGraph } from "@/lib/internal-linking";
import { getRelatedSearchPhrases, getRelatedTopicsForPhrase } from "@/lib/internal-linking";
import type { SearchLandingMoment } from "@/lib/search/landing-types";
import { formatTopicLabel } from "@/lib/topic-keywords";

export type TranscriptFaq = {
  question: string;
  answer: string;
  evidenceVideoId?: string;
  evidenceTimestamp?: number;
};

function sentenceFromSnippet(snippet: string) {
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/[^.!?]+[.!?]?/);
  return (match?.[0] ?? cleaned).trim();
}

export function buildFaqsFromTranscriptEvidence(
  phrase: string,
  moments: SearchLandingMoment[],
  limit = 4
): TranscriptFaq[] {
  const faqs: TranscriptFaq[] = [];
  const used = new Set<string>();

  for (const moment of moments) {
    const sentence = sentenceFromSnippet(moment.snippet);
    if (sentence.length < 40 || used.has(sentence)) continue;

    used.add(sentence);
    faqs.push({
      question: `What do videos say about "${phrase}"?`,
      answer: sentence,
      evidenceVideoId: moment.videoId,
      evidenceTimestamp: moment.startSeconds,
    });

    if (faqs.length >= limit) break;
  }

  if (faqs.length === 0 && moments.length > 0) {
    faqs.push({
      question: `Where is "${phrase}" discussed in indexed videos?`,
      answer: sentenceFromSnippet(moments[0].snippet),
      evidenceVideoId: moments[0].videoId,
      evidenceTimestamp: moments[0].startSeconds,
    });
  }

  return faqs;
}

export function buildAutoInternalLinks(input: {
  phrase: string;
  topVideos: Array<{ videoId: string; title: string; matchCount?: number }>;
}) {
  const graph = buildInternalLinkGraph({
    phrase: input.phrase,
    topVideos: input.topVideos,
  });

  return {
    relatedSearches: graph.relatedPhrases,
    relatedTopics: graph.relatedTopics.map((topic) => ({
      slug: topic.href.replace("/topic/", ""),
      label: topic.label,
      href: topic.href,
    })),
    relatedVideos: graph.relatedVideos,
    relatedSearchPhrases: getRelatedSearchPhrases(input.phrase, 10),
    relatedTopicSlugs: getRelatedTopicsForPhrase(input.phrase, 8).map((slug) => ({
      slug,
      label: formatTopicLabel(slug),
    })),
  };
}
