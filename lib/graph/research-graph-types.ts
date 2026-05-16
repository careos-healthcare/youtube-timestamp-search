/**
 * Research Graph v1 — typed cross-source spoken knowledge model (no DB migration).
 * Moments are nodes, not pages.
 */

export type ResearchGraphNodeKind =
  | "Source"
  | "Video"
  | "TranscriptSegment"
  | "PublicMoment"
  | "Topic"
  | "Creator"
  | "ClaimLikeStatement"
  | "Explanation"
  | "Citation"
  | "Collection"
  | "ResearchSession";

export type ResearchGraphEdgeKind =
  | "explains"
  | "cites"
  | "contradicts_or_caveats"
  | "supports"
  | "same_topic_as"
  | "created_by"
  | "clipped_from"
  | "saved_in"
  | "searched_in_session"
  | "compared_with"
  | "source_context";

export type SourceType = "youtube" | "podcast_rss" | "webinar" | "internal_upload" | "unknown";

export type ResearchGraphNodeBase = {
  id: string;
  kind: ResearchGraphNodeKind;
  label: string;
  /** Provenance / governance metadata */
  properties: Record<string, string | number | boolean | null>;
};

export type SourceNode = ResearchGraphNodeBase & {
  kind: "Source";
  properties: {
    sourceType: SourceType;
    platform: string;
    trustTier: string;
  };
};

export type VideoNode = ResearchGraphNodeBase & {
  kind: "Video";
  properties: {
    videoId: string;
    title: string;
    channelName: string;
    youtubeUrl: string;
  };
};

export type TranscriptSegmentNode = ResearchGraphNodeBase & {
  kind: "TranscriptSegment";
  properties: {
    videoId: string;
    startSeconds: number;
    anchorMomentId: string | null;
  };
};

export type PublicMomentNode = ResearchGraphNodeBase & {
  kind: "PublicMoment";
  properties: {
    momentId: string;
    videoId: string;
    topic: string;
    qualityTier: string;
    citationRich: boolean;
    sourceAuthorityLabel: string;
  };
};

export type TopicNode = ResearchGraphNodeBase & {
  kind: "Topic";
  properties: {
    slug: string;
    researchGradeTier: string | null;
    momentCount: number;
    hubQuality: string | null;
  };
};

export type CreatorNode = ResearchGraphNodeBase & {
  kind: "Creator";
  properties: {
    slug: string;
    displayName: string;
    category: string | null;
  };
};

export type ClaimLikeStatementNode = ResearchGraphNodeBase & {
  kind: "ClaimLikeStatement";
  properties: {
    anchorMomentId: string;
    phrase: string;
    confidence: string;
  };
};

export type ExplanationNode = ResearchGraphNodeBase & {
  kind: "Explanation";
  properties: {
    anchorMomentId: string;
    framing: string;
    beginnerLikelihood: number;
    technicalLikelihood: number;
  };
};

export type CitationNode = ResearchGraphNodeBase & {
  kind: "Citation";
  properties: {
    anchorMomentId: string;
    hasMarkdown: boolean;
    hasAcademic: boolean;
  };
};

export type CollectionNode = ResearchGraphNodeBase & {
  kind: "Collection";
  properties: {
    slug: string;
    momentCount: number;
  };
};

export type ResearchSessionNode = ResearchGraphNodeBase & {
  kind: "ResearchSession";
  properties: {
    sessionId: string;
    researchDepthScore: number | null;
    cohort: string | null;
  };
};

export type ResearchGraphNode =
  | SourceNode
  | VideoNode
  | TranscriptSegmentNode
  | PublicMomentNode
  | TopicNode
  | CreatorNode
  | ClaimLikeStatementNode
  | ExplanationNode
  | CitationNode
  | CollectionNode
  | ResearchSessionNode;

export type ResearchGraphEdge = {
  id: string;
  kind: ResearchGraphEdgeKind;
  sourceId: string;
  targetId: string;
  weight: number;
  properties: Record<string, string | number | boolean | null>;
};

export type ResearchGraphSnapshot = {
  version: 1;
  generatedAt: string;
  nodes: ResearchGraphNode[];
  edges: ResearchGraphEdge[];
  /** Populated by `computeResearchGraphMetrics` in build pipeline. */
  metrics: Record<string, unknown>;
};
