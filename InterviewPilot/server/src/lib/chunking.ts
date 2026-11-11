import {
  RAG_CHUNK_SIZE,
  RAG_CHUNK_OVERLAP,
  RAG_TOP_K,
  RAG_MAX_TOTAL_CHARS,
  EMBEDDING_DIMENSIONS,
} from '../config/constants.js';
import { AppError } from './errors.js';

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Deterministic pure chunking function (RAG-1).
 * Splits text into chunks of at most chunkSize characters with chunkOverlap overlap,
 * preferring paragraph, sentence, and word boundaries.
 */
export function chunkText(text: string, options?: ChunkOptions): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const chunkSize = options?.chunkSize ?? RAG_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? RAG_CHUNK_OVERLAP;

  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be >= 0 and < chunkSize');
  }

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < normalized.length) {
    let endIndex = Math.min(startIndex + chunkSize, normalized.length);

    if (endIndex < normalized.length) {
      // Look back within the overlap window for a natural boundary
      const windowStart = Math.max(startIndex + chunkSize - chunkOverlap, startIndex + 1);
      const searchWindow = normalized.slice(windowStart, endIndex);

      // Search for boundaries in order of preference: paragraph, newline, sentence, space
      const paraBreak = searchWindow.lastIndexOf('\n\n');
      const newlineBreak = searchWindow.lastIndexOf('\n');
      const sentenceBreakMatch = searchWindow.match(/[.!?]\s+(?=[^.!?]*$)/);
      const spaceBreak = searchWindow.lastIndexOf(' ');

      if (paraBreak !== -1) {
        endIndex = windowStart + paraBreak + 2;
      } else if (sentenceBreakMatch && sentenceBreakMatch.index !== undefined) {
        endIndex = windowStart + sentenceBreakMatch.index + sentenceBreakMatch[0].length;
      } else if (newlineBreak !== -1) {
        endIndex = windowStart + newlineBreak + 1;
      } else if (spaceBreak !== -1) {
        endIndex = windowStart + spaceBreak + 1;
      }
    }

    const chunkSlice = normalized.slice(startIndex, endIndex).trim();
    if (chunkSlice.length > 0) {
      chunks.push(chunkSlice);
    }

    if (endIndex >= normalized.length) {
      break;
    }

    // Advance startIndex by keeping chunkOverlap characters, guaranteeing forward progress
    const nextStartCandidate = endIndex - chunkOverlap;
    startIndex = Math.max(startIndex + 1, nextStartCandidate);
  }

  return chunks;
}

export interface RetrievalChunkCandidate {
  id: string;
  documentId: string;
  content: string;
  distance?: number;
}

/**
 * Shape retrieval results by cosine distance, top-k (default 4), and total char budget (default 3,000) (RAG-4).
 */
export function shapeRetrievalResults<T extends RetrievalChunkCandidate>(
  candidates: T[],
  maxTotalChars: number = RAG_MAX_TOTAL_CHARS,
  topK: number = RAG_TOP_K
): T[] {
  // Sort by cosine distance ascending if present
  const sorted = [...candidates].sort((a, b) => {
    const distA = a.distance ?? 0;
    const distB = b.distance ?? 0;
    return distA - distB;
  });

  const selected: T[] = [];
  let currentTotalChars = 0;

  for (const candidate of sorted) {
    if (selected.length >= topK) {
      break;
    }

    const trimmedContent = candidate.content.trim();
    const len = trimmedContent.length;

    if (currentTotalChars + len <= maxTotalChars) {
      selected.push({ ...candidate, content: trimmedContent });
      currentTotalChars += len;
    } else {
      // If we haven't selected any chunk yet and this single chunk exceeds budget,
      // take a truncated slice up to maxTotalChars so something is returned.
      if (selected.length === 0 && maxTotalChars > 0) {
        selected.push({
          ...candidate,
          content: trimmedContent.slice(0, maxTotalChars),
        });
        currentTotalChars += Math.min(len, maxTotalChars);
      }
      break;
    }
  }

  return selected;
}

/**
 * Validate embedding vector dimensions (RAG-3).
 */
export function validateEmbeddingDimensions(
  vector: number[],
  expectedDimensions: number = EMBEDDING_DIMENSIONS
): void {
  if (!Array.isArray(vector) || vector.length !== expectedDimensions) {
    throw new AppError(
      'INVALID_EMBEDDING_DIMENSIONS',
      `Expected embedding dimension ${expectedDimensions}, but received ${vector?.length ?? 0}`,
      500
    );
  }
}

/**
 * Validate server startup embedding configuration against vector schema dimension (RAG-3).
 */
export function validateStartupEmbeddingConfig(
  configuredDimensions: number,
  expectedDimensions: number = EMBEDDING_DIMENSIONS
): void {
  if (configuredDimensions !== expectedDimensions) {
    throw new Error(
      `Startup embedding dimension mismatch: EMBEDDING_DIMENSIONS (${configuredDimensions}) must equal database schema dimension (${expectedDimensions})`
    );
  }
}
