import { CREATOR_SEEDS } from "@/lib/creator-seeds";
import { detectEntities } from "@/lib/query-quality/entity-phrase-detector";
import { contentTokens } from "@/lib/query-quality/stopword-filter";
import { TOPIC_SEEDS } from "@/lib/topic-seeds";
import { normalizeText } from "@/lib/youtube";

export type KnowledgeEntity = {
  id: string;
  label: string;
  type: "concept" | "creator" | "topic" | "tool";
  frequency: number;
};

export function extractEntitiesFromPhrase(phrase: string, frequency = 1): KnowledgeEntity[] {
  const entities: KnowledgeEntity[] = [];
  const detection = detectEntities(phrase);

  for (const entity of detection.matchedEntities) {
    entities.push({
      id: `entity:${entity.replace(/\s+/g, "-")}`,
      label: entity,
      type: "concept",
      frequency,
    });
  }

  for (const creator of detection.creatorMatches) {
    entities.push({
      id: `creator:${creator.toLowerCase().replace(/\s+/g, "-")}`,
      label: creator,
      type: "creator",
      frequency,
    });
  }

  for (const topic of detection.topicMatches) {
    entities.push({
      id: `topic:${topic.toLowerCase().replace(/\s+/g, "-")}`,
      label: topic,
      type: "topic",
      frequency,
    });
  }

  return entities;
}

export function extractEntitiesFromTranscriptSnippet(snippet: string) {
  const tokens = contentTokens(snippet);
  const entities: KnowledgeEntity[] = [];

  for (const token of tokens.slice(0, 6)) {
    entities.push({
      id: `entity:${token}`,
      label: token,
      type: "concept",
      frequency: 1,
    });
  }

  for (const creator of CREATOR_SEEDS) {
    if (snippet.toLowerCase().includes(creator.displayName.toLowerCase())) {
      entities.push({
        id: `creator:${creator.slug}`,
        label: creator.displayName,
        type: "creator",
        frequency: 1,
      });
    }
  }

  for (const topic of TOPIC_SEEDS) {
    const label = topic.displayName.toLowerCase();
    if (snippet.toLowerCase().includes(label) || snippet.toLowerCase().includes(topic.slug.replace(/-/g, " "))) {
      entities.push({
        id: `topic:${topic.slug}`,
        label: topic.displayName,
        type: "topic",
        frequency: 1,
      });
    }
  }

  return entities;
}

export function mergeEntities(existing: KnowledgeEntity[], incoming: KnowledgeEntity[]) {
  const map = new Map(existing.map((entity) => [entity.id, entity]));

  for (const entity of incoming) {
    const current = map.get(entity.id);
    if (current) {
      current.frequency += entity.frequency;
    } else {
      map.set(entity.id, { ...entity });
    }
  }

  return [...map.values()].sort((left, right) => right.frequency - left.frequency);
}

export function normalizeEntityLabel(label: string) {
  return normalizeText(label).toLowerCase();
}
