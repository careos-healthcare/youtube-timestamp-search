export type ConceptLineageEdge = {
  parent: string;
  child: string;
  confidence: number;
};

const LINEAGE_SEEDS: ConceptLineageEdge[] = [
  { parent: "artificial intelligence", child: "machine learning", confidence: 0.9 },
  { parent: "machine learning", child: "deep learning", confidence: 0.88 },
  { parent: "deep learning", child: "neural networks", confidence: 0.86 },
  { parent: "machine learning", child: "reinforcement learning", confidence: 0.8 },
  { parent: "artificial intelligence", child: "large language models", confidence: 0.82 },
  { parent: "large language models", child: "rag", confidence: 0.78 },
  { parent: "large language models", child: "prompt engineering", confidence: 0.76 },
  { parent: "startup", child: "product market fit", confidence: 0.74 },
  { parent: "startup", child: "fundraising", confidence: 0.72 },
  { parent: "saas", child: "saas pricing", confidence: 0.7 },
  { parent: "kubernetes", child: "docker", confidence: 0.55 },
  { parent: "react", child: "typescript", confidence: 0.52 },
];

export function buildConceptLineage() {
  return LINEAGE_SEEDS;
}

export function findLineageForConcept(concept: string) {
  const normalized = concept.toLowerCase();
  return LINEAGE_SEEDS.filter(
    (edge) => edge.parent === normalized || edge.child === normalized
  );
}
