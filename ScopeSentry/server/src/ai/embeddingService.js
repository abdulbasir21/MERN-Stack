import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

let genAiClient = null;

function getGenAiClient() {
  if (!genAiClient && config.geminiApiKey) {
    genAiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return genAiClient;
}

// In-memory test mock for deterministic testing without external API hits (AGENTS.md rule 4)
let testMock = null;

export function setEmbeddingMock(mock) {
  testMock = mock;
}

export function getEmbeddingMock() {
  return testMock;
}

export function clearEmbeddingMock() {
  testMock = null;
}

/**
 * Generate deterministic normalized vector for mock tests
 */
export function generateDeterministicVector(text, dimensions = 768) {
  const vector = new Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dimensions; i++) {
    vector[i] = vector[i] / norm;
  }
  return vector;
}

/**
 * Generate embedding for a single text string
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getEmbedding(text) {
  if (testMock?.getEmbedding) {
    return testMock.getEmbedding(text);
  }

  // AGENTS.md rule 4: In test mode, always use deterministic mock vector unless real Gemini suite is requested
  if (config.env === 'test' && !process.env.USE_REAL_GEMINI) {
    return generateDeterministicVector(text, config.embeddingDimensions);
  }

  const ai = getGenAiClient();
  if (!ai) {
    return generateDeterministicVector(text, config.embeddingDimensions);
  }

  try {
    const response = await ai.models.embedContent({
      model: config.geminiEmbeddingModel || 'text-embedding-004',
      contents: [text],
      config: {
        outputDimensionality: config.embeddingDimensions
      }
    });

    const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
    if (values && Array.isArray(values)) {
      return values;
    }
  } catch (err) {
    console.warn(`[Embedding] embedContent fallback: ${err.message}`);
  }

  return generateDeterministicVector(text, config.embeddingDimensions);
}

/**
 * Generate embeddings for batch of text strings
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function getBatchEmbeddings(texts) {
  if (testMock?.getBatchEmbeddings) {
    return testMock.getBatchEmbeddings(texts);
  }

  if (config.env === 'test' && !process.env.USE_REAL_GEMINI) {
    return texts.map((t) => generateDeterministicVector(t, config.embeddingDimensions));
  }

  // Process sequentially or in batches of 10 to respect rate limits
  const results = [];
  for (const text of texts) {
    const vec = await getEmbedding(text);
    results.push(vec);
  }
  return results;
}
