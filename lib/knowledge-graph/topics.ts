import { TOPIC_SEEDS } from "@/lib/topic-seeds";

export type KnowledgeTopicNode = {
  id: string;
  slug: string;
  label: string;
  cluster: string;
  depth: number;
};

export function buildTopicNodes(): KnowledgeTopicNode[] {
  return TOPIC_SEEDS.map((topic) => ({
    id: `topic:${topic.slug}`,
    slug: topic.slug,
    label: topic.displayName,
    cluster: topic.cluster,
    depth: topic.featured ? 2 : 1,
  }));
}

export function getTopicNodeBySlug(slug: string, nodes = buildTopicNodes()) {
  return nodes.find((node) => node.slug === slug);
}
