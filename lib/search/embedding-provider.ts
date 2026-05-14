import { createHash } from "node:crypto";

export type EmbeddingBatchResult = {
  model: string;
  dimensions: number;
  embeddings: number[][];
};

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 64;

export function getEmbeddingModelName() {
  return (
    process.env.EMBEDDING_MODEL?.trim() ||
    process.env.SEMANTIC_EMBEDDING_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

export function getEmbeddingDimensions() {
  const configured = Number(process.env.EMBEDDING_DIMENSIONS ?? DEFAULT_DIMENSIONS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DIMENSIONS;
}

export function isEmbeddingProviderAvailable() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hashEmbeddingText(text: string) {
  return createHash("sha256").update(normalizeEmbeddingInput(text)).digest("hex");
}

function normalizeEmbeddingInput(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function callOpenAiEmbeddings(inputs: string[]): Promise<EmbeddingBatchResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new EmbeddingProviderError("missing_api_key", "OPENAI_API_KEY is not configured.");
  }

  const model = getEmbeddingModelName();
  const dimensions = getEmbeddingDimensions();

  const body: Record<string, unknown> = {
    model,
    input: inputs.map(normalizeEmbeddingInput),
  };

  if (model.startsWith("text-embedding-3")) {
    body.dimensions = dimensions;
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new EmbeddingProviderError(
      "openai_request_failed",
      `OpenAI embeddings request failed (${response.status}): ${detail.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };

  const rows = [...(payload.data ?? [])].sort(
    (left, right) => Number(left.index ?? 0) - Number(right.index ?? 0)
  );

  if (rows.length !== inputs.length) {
    throw new EmbeddingProviderError(
      "openai_response_mismatch",
      `Expected ${inputs.length} embeddings, received ${rows.length}.`
    );
  }

  const embeddings = rows.map((row) => row.embedding ?? []);
  if (embeddings.some((vector) => vector.length === 0)) {
    throw new EmbeddingProviderError("openai_empty_embedding", "OpenAI returned an empty embedding vector.");
  }

  return {
    model: getEmbeddingModelName(),
    dimensions: embeddings[0]?.length ?? dimensions,
    embeddings,
  };
}

export async function embedTexts(texts: string[], options?: { batchSize?: number }) {
  if (texts.length === 0) {
    return { model: getEmbeddingModelName(), dimensions: getEmbeddingDimensions(), embeddings: [] as number[][] };
  }

  if (!isEmbeddingProviderAvailable()) {
    throw new EmbeddingProviderError("missing_api_key", "OPENAI_API_KEY is not configured.");
  }

  const batchSize = Math.min(Math.max(options?.batchSize ?? 32, 1), MAX_BATCH_SIZE);
  const allEmbeddings: number[][] = [];
  let model = getEmbeddingModelName();
  let dimensions = getEmbeddingDimensions();

  for (let index = 0; index < texts.length; index += batchSize) {
    const chunk = texts.slice(index, index + batchSize);
    const result = await callOpenAiEmbeddings(chunk);
    model = result.model;
    dimensions = result.dimensions;
    allEmbeddings.push(...result.embeddings);
  }

  return { model, dimensions, embeddings: allEmbeddings };
}

export async function embedQuery(query: string) {
  const result = await embedTexts([query], { batchSize: 1 });
  return {
    model: result.model,
    dimensions: result.dimensions,
    embedding: result.embeddings[0] ?? [],
  };
}

export class EmbeddingProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EmbeddingProviderError";
    this.code = code;
  }
}
