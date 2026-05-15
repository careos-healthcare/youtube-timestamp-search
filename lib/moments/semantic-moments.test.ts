import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { areNearDuplicateMoments, phraseTokenJaccard } from "@/lib/moments/semantic-moment-dedupe";
import { labelSemanticMomentTopics } from "@/lib/moments/semantic-moment-topics";
import { extractSemanticPhrasesFromTranscript } from "@/lib/moments/semantic-extractor";
import { rejectWeakSemanticPhrase } from "@/lib/moments/semantic-phrase-gates";
import type { TranscriptLine } from "@/lib/transcript-types";

describe("semantic phrase gates", () => {
  it("rejects weak single-token phrases", () => {
    assert.equal(rejectWeakSemanticPhrase("data").ok, false);
    assert.equal(rejectWeakSemanticPhrase("going").ok, false);
    assert.equal(rejectWeakSemanticPhrase("kubernetes").ok, false);
  });

  it("accepts multi-word non-generic phrases", () => {
    assert.equal(
      rejectWeakSemanticPhrase("retrieval augmented generation for production").ok,
      true
    );
  });
});

describe("semantic extractor", () => {
  it("extracts question-like and definition-style phrases", () => {
    const lines: TranscriptLine[] = [
      { text: "So what is retrieval augmented generation in practice?", start: 1, duration: 1 },
      { text: "The key idea is you combine a vector index with an LLM.", start: 4, duration: 2 },
      { text: "Compared to fine tuning this is much cheaper for many teams.", start: 9, duration: 2 },
    ];
    const got = extractSemanticPhrasesFromTranscript(lines, { maxCandidates: 40 });
    const phrases = got.map((g) => g.phrase.toLowerCase());
    assert.ok(phrases.some((p) => p.includes("retrieval augmented") || p.includes("vector index")));
    assert.ok(got.some((g) => g.kinds.includes("question") || g.kinds.includes("definition")));
  });
});

describe("topic labeling", () => {
  it("labels primary topic and related concepts", () => {
    const labeled = labelSemanticMomentTopics({
      phrase: "vector database architecture for embeddings",
      snippet:
        "We store embeddings in a vector database so the model can retrieve relevant chunks at query time without scanning the full corpus.",
      extractionKinds: ["explanation", "technical_entity"],
      indexed: {
        videoId: "abc",
        videoUrl: "https://youtube.com/watch?v=abc",
        title: "Test video",
        channelName: "Test Channel",
        category: "tech",
        topic: "vector search",
        fetchedAt: new Date().toISOString(),
        segmentCount: 10,
        previewSnippet: "",
        thumbnailUrl: "",
        relatedTopics: [{ slug: "embeddings", label: "Embeddings" }],
        relatedCreators: [],
      },
    });
    assert.equal(labeled.primaryTopic, "vector search");
    assert.ok(labeled.secondaryTopics.length > 0 || labeled.relatedConcepts.length > 0);
    assert.ok(labeled.topicClusterHint);
  });
});

describe("near-duplicate prevention", () => {
  it("flags same-video nearby timestamps with similar phrases", () => {
    const a = { videoId: "v1", startSeconds: 10, phrase: "vector database architecture" };
    const b = { videoId: "v1", startSeconds: 12, phrase: "vector database architecture" };
    assert.ok(areNearDuplicateMoments(a, b));
    assert.equal(areNearDuplicateMoments(a, { ...b, videoId: "v2" }), false);
  });

  it("computes jaccard for token overlap", () => {
    const j = phraseTokenJaccard("hello world test", "hello world test again");
    assert.ok(j >= 0.5);
  });
});
