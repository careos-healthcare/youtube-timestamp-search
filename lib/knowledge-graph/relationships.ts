export type KnowledgeRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  type: "explains" | "co_occurs" | "specializes" | "references" | "canonical_for";
  weight: number;
};

export function buildRelationship(
  sourceId: string,
  targetId: string,
  type: KnowledgeRelationship["type"],
  weight = 1
): KnowledgeRelationship {
  return {
    id: `${type}:${sourceId}->${targetId}`,
    sourceId,
    targetId,
    type,
    weight,
  };
}

export function mergeRelationships(existing: KnowledgeRelationship[], incoming: KnowledgeRelationship[]) {
  const map = new Map(existing.map((relationship) => [relationship.id, relationship]));

  for (const relationship of incoming) {
    const current = map.get(relationship.id);
    if (current) {
      current.weight += relationship.weight;
    } else {
      map.set(relationship.id, { ...relationship });
    }
  }

  return [...map.values()].sort((left, right) => right.weight - left.weight);
}
