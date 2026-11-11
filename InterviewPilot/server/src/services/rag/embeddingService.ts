import { env } from '../../config/env.js';
import { EMBEDDING_DIMENSIONS } from '../../config/constants.js';
import { validateEmbeddingDimensions } from '../../lib/chunking.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AppError } from '../../lib/errors.js';

export interface EmbeddingGenerator {
  embedTexts(texts: string[], options?: { userId?: string }): Promise<number[][]>;
  embedQuery(query: string, options?: { userId?: string }): Promise<number[]>;
}

/**
 * Generate a deterministic normalized 768-dimensional vector from string for tests.
 */
export function generateMockVector(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();

  // Create deterministic hash-based feature representation
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * 31 + i * 17) % dimensions;
    vec[index] += 1.0;
  }

  // Also spread character frequency into neighboring coordinates for smoothness
  for (let d = 0; d < dimensions; d++) {
    vec[d] += Math.sin((d + 1) * 0.1) * 0.01;
  }

  // Normalize to unit vector for cosine distance
  let normSq = 0;
  for (let i = 0; i < dimensions; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < dimensions; i++) {
    vec[i] = Number((vec[i] / norm).toFixed(6));
  }

  return vec;
}

export class MockEmbeddingGenerator implements EmbeddingGenerator {
  public callCount = 0;

  async embedTexts(texts: string[], _options?: { userId?: string }): Promise<number[][]> {
    this.callCount++;
    return texts.map((t) => {
      const v = generateMockVector(t);
      validateEmbeddingDimensions(v, EMBEDDING_DIMENSIONS);
      return v;
    });
  }

  async embedQuery(query: string, _options?: { userId?: string }): Promise<number[]> {
    this.callCount++;
    const v = generateMockVector(query);
    validateEmbeddingDimensions(v, EMBEDDING_DIMENSIONS);
    return v;
  }
}

export class GeminiEmbeddingGenerator implements EmbeddingGenerator {
  async embedTexts(texts: string[], options?: { userId?: string }): Promise<number[][]> {
    if (texts.length === 0) return [];

    const actorUserId = options?.userId || 'SYSTEM_EMBED';
    // Estimate tokens: ~1 token per 4 characters across all chunk texts
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    const estimatedTokens = Math.max(10, Math.ceil(totalChars / 4));

    return withAiUsage(
      {
        actorUserId,
        operation: 'DOCUMENT_EMBEDDING',
        model: env.GEMINI_EMBEDDING_MODEL,
        estimatedInputTokens: estimatedTokens,
        userDailyRequestCap: 1_000_000,
      },
      async () => {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
          const vectors: number[][] = [];

          for (const text of texts) {
            const resp = await ai.models.embedContent({
              model: env.GEMINI_EMBEDDING_MODEL,
              contents: text,
            });
            const values = resp?.embeddings?.[0]?.values || [];
            validateEmbeddingDimensions(values, EMBEDDING_DIMENSIONS);
            vectors.push(values);
          }

          return {
            result: vectors,
            usage: {
              inputTokens: estimatedTokens,
              outputTokens: 0,
            },
          };
        } catch (err) {
          throw new AppError(
            'EMBEDDING_FAILED',
            `Gemini embedding generation failed: ${err instanceof Error ? err.message : String(err)}`,
            502
          );
        }
      }
    );
  }

  async embedQuery(query: string, options?: { userId?: string }): Promise<number[]> {
    const actorUserId = options?.userId || 'SYSTEM_EMBED';
    const estimatedTokens = Math.max(5, Math.ceil(query.length / 4));

    return withAiUsage(
      {
        actorUserId,
        operation: 'QUERY_EMBEDDING',
        model: env.GEMINI_EMBEDDING_MODEL,
        estimatedInputTokens: estimatedTokens,
        userDailyRequestCap: 1_000_000,
      },
      async () => {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
          const resp = await ai.models.embedContent({
            model: env.GEMINI_EMBEDDING_MODEL,
            contents: query,
          });
          const values = resp?.embeddings?.[0]?.values || [];
          validateEmbeddingDimensions(values, EMBEDDING_DIMENSIONS);

          return {
            result: values,
            usage: {
              inputTokens: estimatedTokens,
              outputTokens: 0,
            },
          };
        } catch (err) {
          throw new AppError(
            'EMBEDDING_FAILED',
            `Gemini query embedding failed: ${err instanceof Error ? err.message : String(err)}`,
            502
          );
        }
      }
    );
  }
}

let activeEmbeddingGenerator: EmbeddingGenerator = new GeminiEmbeddingGenerator();

export function getEmbeddingGenerator(): EmbeddingGenerator {
  return activeEmbeddingGenerator;
}

export function setEmbeddingGenerator(generator: EmbeddingGenerator): void {
  activeEmbeddingGenerator = generator;
}

export function resetEmbeddingGenerator(): void {
  activeEmbeddingGenerator = new GeminiEmbeddingGenerator();
}
