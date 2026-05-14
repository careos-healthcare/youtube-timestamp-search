import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { getAllSearchSuggestionPhrases } from "@/lib/search-suggestions";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCachedTranscript, listCachedTranscripts } from "@/lib/transcript-cache";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "before",
  "could",
  "going",
  "really",
  "should",
  "something",
  "their",
  "there",
  "these",
  "think",
  "those",
  "video",
  "would",
  "youtube",
  "that",
  "this",
  "with",
  "from",
  "have",
  "what",
  "when",
  "where",
  "which",
]);

export type MinedQuery = {
  phrase: string;
  score: number;
  sources: string[];
  category: string;
};

export type HighIntentQueryReport = {
  generatedAt: string;
  indexedVideosScanned: number;
  likelyHighVolume: MinedQuery[];
  lowCompetitionLongTail: MinedQuery[];
  questionStyle: MinedQuery[];
  technicalConcepts: MinedQuery[];
  podcastStyle: MinedQuery[];
  personalityDriven: MinedQuery[];
  internalSearches: MinedQuery[];
  zeroResultSearches: MinedQuery[];
  repeatedPhrases: MinedQuery[];
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9'-]+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function addCandidate(
  map: Map<string, { score: number; sources: Set<string>; category: string }>,
  phrase: string,
  score: number,
  source: string,
  category: string
) {
  const normalized = phrase.trim().toLowerCase();
  if (normalized.length < 3) return;

  const existing = map.get(normalized);
  if (existing) {
    existing.score += score;
    existing.sources.add(source);
    return;
  }

  map.set(normalized, { score, sources: new Set([source]), category });
}

function toMinedQueries(
  map: Map<string, { score: number; sources: Set<string>; category: string }>,
  filter?: (phrase: string, meta: { score: number; sources: Set<string>; category: string }) => boolean,
  limit = 40
) {
  return [...map.entries()]
    .filter(([phrase, meta]) => (filter ? filter(phrase, meta) : true))
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, limit)
    .map(([phrase, meta]) => ({
      phrase,
      score: meta.score,
      sources: [...meta.sources],
      category: meta.category,
    }));
}

async function loadAnalyticsQueries() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { searches: [] as string[], zeroResults: [] as string[] };
  }

  const [{ data: searchRows }, { data: zeroRows }] = await Promise.all([
    supabase
      .from("search_analytics_events")
      .select("query")
      .not("query", "is", null)
      .in("event_name", ["search_query", "homepage_search", "search_submitted", "indexed_transcript_search"])
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("search_analytics_events")
      .select("query")
      .not("query", "is", null)
      .in("event_name", ["search_zero_results", "no_results"])
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  return {
    searches: (searchRows ?? []).map((row) => row.query?.trim() ?? "").filter(Boolean),
    zeroResults: (zeroRows ?? []).map((row) => row.query?.trim() ?? "").filter(Boolean),
  };
}

export async function mineHighIntentQueries(): Promise<HighIntentQueryReport> {
  const summaries = await listCachedTranscripts();
  const phraseMap = new Map<string, { score: number; sources: Set<string>; category: string }>();
  const repeatedMap = new Map<string, number>();

  for (const seed of PRIORITY_SEARCH_QUERIES) {
    addCandidate(phraseMap, seed.phrase, 12, "priority-search-seed", "priority");
  }

  for (const suggestion of getAllSearchSuggestionPhrases()) {
    addCandidate(phraseMap, suggestion, 6, "autocomplete", "autocomplete");
  }

  for (const topic of TOPIC_SEEDS) {
    addCandidate(phraseMap, topic.displayName, topic.featured ? 8 : 4, "topic-seed", "topic");
    addCandidate(phraseMap, topic.slug.replace(/-/g, " "), 3, "topic-slug", "topic");
  }

  const analytics = await loadAnalyticsQueries();
  for (const query of analytics.searches) {
    addCandidate(phraseMap, query, 10, "internal-search", "internal");
  }
  for (const query of analytics.zeroResults) {
    addCandidate(phraseMap, query, 14, "zero-result-search", "zero-result");
  }

  const scanLimit = Math.min(summaries.length, 120);
  for (const summary of summaries.slice(0, scanLimit)) {
    const cached = await getCachedTranscript(summary.videoId);
    if (!cached) continue;

    for (const segment of cached.segments) {
      const words = tokenize(segment.text);
      for (const word of words) {
        repeatedMap.set(word, (repeatedMap.get(word) ?? 0) + 1);
      }

      for (let index = 0; index < words.length - 1; index += 1) {
        const bigram = `${words[index]} ${words[index + 1]}`;
        repeatedMap.set(bigram, (repeatedMap.get(bigram) ?? 0) + 1);
      }
    }
  }

  for (const [phrase, count] of repeatedMap.entries()) {
    if (count < 3) continue;
    addCandidate(phraseMap, phrase, count, "indexed-transcript", "repeated");
  }

  for (const creator of CREATOR_SEEDS) {
    addCandidate(phraseMap, creator.displayName, 8, "creator-seed", "personality");
    for (const alias of creator.aliases) {
      addCandidate(phraseMap, alias, 6, "creator-alias", "personality");
    }
    for (const topic of creator.popularTopics) {
      addCandidate(phraseMap, `${creator.displayName} ${topic}`, 7, "creator-topic", "personality");
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    indexedVideosScanned: scanLimit,
    likelyHighVolume: toMinedQueries(
      phraseMap,
      (phrase, meta) => phrase.split(/\s+/).length <= 3 && meta.score >= 10,
      35
    ),
    lowCompetitionLongTail: toMinedQueries(
      phraseMap,
      (phrase, meta) => phrase.split(/\s+/).length >= 4 && meta.score >= 4 && meta.score <= 20,
      35
    ),
    questionStyle: toMinedQueries(
      phraseMap,
      (phrase) =>
        /^(how|what|why|when|where|is|are|can|should|does|do)\b/.test(phrase) ||
        phrase.includes("?"),
      35
    ),
    technicalConcepts: toMinedQueries(
      phraseMap,
      (phrase) =>
        /\b(ai|api|python|javascript|react|docker|kubernetes|llm|rag|sql|typescript|machine learning|neural|database|system design|prompt)\b/.test(
          phrase
        ),
      35
    ),
    podcastStyle: toMinedQueries(
      phraseMap,
      (phrase) =>
        /\b(podcast|interview|episode|clip|host|guest|conversation|talk)\b/.test(phrase),
      35
    ),
    personalityDriven: toMinedQueries(
      phraseMap,
      (phrase, meta) => meta.category === "personality" || meta.sources.has("creator-topic"),
      35
    ),
    internalSearches: toMinedQueries(
      phraseMap,
      (_phrase, meta) => meta.sources.has("internal-search"),
      35
    ),
    zeroResultSearches: toMinedQueries(
      phraseMap,
      (_phrase, meta) => meta.sources.has("zero-result-search"),
      35
    ),
    repeatedPhrases: [...repeatedMap.entries()]
      .filter(([, count]) => count >= 8)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 35)
      .map(([phrase, count]) => ({
        phrase,
        score: count,
        sources: ["indexed-transcript"],
        category: "repeated",
      })),
  };
}

export function formatHighIntentQueryReport(report: HighIntentQueryReport) {
  const section = (title: string, items: MinedQuery[]) => {
    if (items.length === 0) {
      return `## ${title}\n\n_No candidates yet._\n`;
    }

    const rows = items
      .map(
        (item, index) =>
          `| ${index + 1} | ${item.phrase.replace(/\|/g, "\\|")} | ${item.score} | ${item.sources.join(", ")} |`
      )
      .join("\n");

    return `## ${title}\n\n| Rank | Query | Score | Sources |\n|------|-------|------:|---------|\n${rows}\n`;
  };

  return `# High-intent query report

Generated: ${report.generatedAt}

Indexed videos scanned: ${report.indexedVideosScanned}

${section("Likely high-volume queries", report.likelyHighVolume)}
${section("Low-competition long-tail queries", report.lowCompetitionLongTail)}
${section("Question-style searches", report.questionStyle)}
${section("Repeated technical concepts", report.technicalConcepts)}
${section("Podcast-style queries", report.podcastStyle)}
${section("Celebrity / personality-driven searches", report.personalityDriven)}
${section("Internal searches", report.internalSearches)}
${section("Zero-result searches", report.zeroResultSearches)}
${section("Repeated phrases in indexed transcripts", report.repeatedPhrases)}

## Regenerate

\`\`\`bash
npm run discover:queries
\`\`\`
`;
}
