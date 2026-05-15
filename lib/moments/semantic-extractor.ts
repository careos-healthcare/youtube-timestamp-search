import { normalizeText } from "@/lib/youtube";

import { rejectWeakSemanticPhrase } from "@/lib/moments/semantic-phrase-gates";
import type { TranscriptLine } from "@/lib/transcript-types";

export type SemanticExtractionKind =
  | "noun_phrase"
  | "multi_word_concept"
  | "technical_entity"
  | "question"
  | "explanation"
  | "comparison"
  | "prediction"
  | "definition"
  | "framework"
  | "argument";

export type SemanticPhraseCandidate = {
  phrase: string;
  kinds: SemanticExtractionKind[];
  /** Best-effort anchor start (seconds) from transcript window. */
  approxStartSeconds: number;
  /** Line index of window center. */
  lineIndex: number;
};

type InternalHit = { text: string; kinds: SemanticExtractionKind[] };

const TRAILING_PUNCT = /[.,:;!?)"'\]]+$/;
const LEADING_PUNCT = /^[[("'“]+/;

function cleanSpan(span: string) {
  let s = normalizeText(span.replace(/\s+/g, " "));
  s = s.replace(LEADING_PUNCT, "").replace(TRAILING_PUNCT, "");
  return normalizeText(s);
}

function pushUnique(hits: InternalHit[], text: string, kinds: SemanticExtractionKind[]) {
  const phrase = cleanSpan(text);
  if (!phrase || phrase.length < 10) return;
  if (!rejectWeakSemanticPhrase(phrase).ok) return;
  const mergedKinds = [...kinds];
  const prev = hits.find((h) => h.text.toLowerCase() === phrase.toLowerCase());
  if (prev) {
    for (const k of mergedKinds) {
      if (!prev.kinds.includes(k)) prev.kinds.push(k);
    }
    return;
  }
  hits.push({ text: phrase, kinds: mergedKinds });
}

function extractFromWindow(windowText: string): InternalHit[] {
  const hits: InternalHit[] = [];
  const t = windowText;

  const patterns: Array<{ re: RegExp; kinds: SemanticExtractionKind[]; group?: number }> = [
    {
      re: /\bwhat\s+(?:is|are)\s+([^?.!\n]{8,120})/gi,
      kinds: ["definition", "explanation", "question"],
      group: 1,
    },
    {
      re: /\bhow\s+(?:do|does|did|can|could|should|would)\s+([^?.!\n]{8,120})/gi,
      kinds: ["explanation", "question"],
      group: 1,
    },
    {
      re: /\bwhy\s+(?:do|does|did|is|are|would|should)\s+([^?.!\n]{8,120})/gi,
      kinds: ["argument", "question", "explanation"],
      group: 1,
    },
    {
      re: /\b(?:who|where|when)\s+(?:is|are|was|were|do|does|did)\s+([^?.!\n]{8,120})/gi,
      kinds: ["question"],
      group: 1,
    },
    {
      re: /\bthe\s+(?:definition|idea|framework|model|key)\s+of\s+([^?.!\n]{8,100})/gi,
      kinds: ["definition", "framework"],
      group: 1,
    },
    {
      re: /\b(?:compared\s+to|rather\s+than|on\s+the\s+other\s+hand|versus|vs\.?)\s+([^?.!\n]{8,100})/gi,
      kinds: ["comparison"],
      group: 1,
    },
    {
      re: /\bthe\s+difference\s+between\s+([^?.!\n]{10,120})/gi,
      kinds: ["comparison", "explanation"],
      group: 1,
    },
    {
      re: /\b(?:i\s+think|we\s+think|i\s+believe|probably|likely|going\s+to|in\s+the\s+future|prediction\s+is)\b[^.?\n]{0,40}([^.?\n]{12,120})/gi,
      kinds: ["prediction"],
      group: 1,
    },
    {
      re: /\b(?:first\s+principles|mental\s+model|the\s+analogy|think\s+of\s+it\s+as|in\s+other\s+words|what\s+that\s+means)\b[^.?\n]{0,30}([^.?\n]{10,120})/gi,
      kinds: ["framework", "explanation"],
      group: 1,
    },
    {
      re: /\b(?:the\s+reason|because\s+of|the\s+point\s+is|the\s+goal\s+is)\s+([^?.!\n]{10,120})/gi,
      kinds: ["argument", "explanation"],
      group: 1,
    },
  ];

  for (const { re, kinds, group } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const cap = group != null ? m[group] : m[0];
      if (cap) pushUnique(hits, cap, kinds);
    }
  }

  const questionSweep =
    /\b(?:who|what|where|when|why|how|do|does|did|can|could|should|would|is|are|was|were)\b[\s\S]{4,180}\?/gi;
  let qm: RegExpExecArray | null;
  while ((qm = questionSweep.exec(t)) !== null) {
    pushUnique(hits, qm[0], ["question"]);
  }

  const titleCase = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
  let tm: RegExpExecArray | null;
  while ((tm = titleCase.exec(t)) !== null) {
    pushUnique(hits, tm[1]!, ["technical_entity", "noun_phrase"]);
  }

  const techChunk =
    /\b((?:[a-z]{3,}\s+){1,3}(?:api|sdk|gpu|cpu|llm|rag|sql|json|http|aws|gcp|ui|ux|ml|ai))\b/gi;
  let xm: RegExpExecArray | null;
  while ((xm = techChunk.exec(t)) !== null) {
    pushUnique(hits, xm[1]!, ["technical_entity", "multi_word_concept"]);
  }

  const nouny =
    /\b((?:[a-z]{4,}\s+){2,5}(?:system|stack|pipeline|architecture|protocol|layer|model|agent|cluster|index|cache|queue|graph|database|network|kernel|runtime))\b/gi;
  let nm: RegExpExecArray | null;
  while ((nm = nouny.exec(t)) !== null) {
    pushUnique(hits, nm[1]!, ["noun_phrase", "multi_word_concept"]);
  }

  return hits;
}

function mergeWindowLines(lines: TranscriptLine[], center: number, radius: number) {
  const lo = Math.max(0, center - radius);
  const hi = Math.min(lines.length - 1, center + radius);
  const chunk = lines.slice(lo, hi + 1);
  const text = normalizeText(chunk.map((l) => l.text).join(" "));
  const start = chunk[0]?.start ?? lines[center]?.start ?? 0;
  return { text, start, lineIndex: center };
}

/**
 * Extract semantic, multi-word moment phrases from transcript lines.
 * Avoids generic single-token stems; callers still run hybrid match + quality gates.
 */
export function extractSemanticPhrasesFromTranscript(
  lines: TranscriptLine[],
  options?: { windowRadius?: number; maxCandidates?: number }
): SemanticPhraseCandidate[] {
  const radius = options?.windowRadius ?? 1;
  const maxCandidates = options?.maxCandidates ?? 220;

  const merged = new Map<string, SemanticPhraseCandidate>();

  for (let i = 0; i < lines.length; i += 1) {
    const { text, start, lineIndex } = mergeWindowLines(lines, i, radius);
    if (text.length < 24) continue;
    const rawHits = extractFromWindow(text);
    for (const h of rawHits) {
      const phrase = cleanSpan(h.text);
      if (!rejectWeakSemanticPhrase(phrase).ok) continue;
      const key = phrase.toLowerCase();
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, {
          phrase,
          kinds: [...h.kinds],
          approxStartSeconds: start,
          lineIndex,
        });
      } else {
        for (const k of h.kinds) {
          if (!prev.kinds.includes(k)) prev.kinds.push(k);
        }
      }
    }
  }

  const out = [...merged.values()];
  out.sort((a, b) => b.kinds.length - a.kinds.length || b.phrase.length - a.phrase.length);
  return out.slice(0, maxCandidates);
}
