import { prisma as defaultPrisma } from '../../db/prisma.js';
import { chunkText, shapeRetrievalResults, RetrievalChunkCandidate } from '../../lib/chunking.js';
import { getEmbeddingGenerator } from './embeddingService.js';
import { AppError } from '../../lib/errors.js';
import { RAG_TOP_K, RAG_MAX_TOTAL_CHARS } from '../../config/constants.js';

export interface IndexChunksResult {
  documentId: string;
  chunkCount: number;
}

export interface RetrieveParams {
  userId: string;
  query: string;
  documentIds: string[];
  topK?: number;
  maxTotalChars?: number;
}

/**
 * Deterministically chunks and indexes a document with vector embeddings (RAG-1, RAG-2, RAG-6).
 * Replaces existing chunks for the document in a single atomic transaction.
 */
export async function indexDocumentChunks(
  documentId: string,
  userId: string,
  text: string,
  client = defaultPrisma
): Promise<IndexChunksResult> {
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    await client.documentChunk.deleteMany({
      where: { documentId },
    });
    return { documentId, chunkCount: 0 };
  }

  // Generate embeddings for all chunks through the embedding generator (RAG-6)
  const embeddingGen = getEmbeddingGenerator();
  const embeddings = await embeddingGen.embedTexts(chunks, { userId });

  // Atomic replacement of chunks in a transaction
  await client.$transaction(
    async (tx) => {
      // 1. Delete any existing chunks for this document
      await tx.documentChunk.deleteMany({
        where: { documentId },
      });

      // 2. Insert newly generated chunks with vector embeddings
      for (let index = 0; index < chunks.length; index++) {
        const content = chunks[index];
        const vector = embeddings[index];
        const chunkId = `chk_${documentId}_${index}_${Date.now()}`;
        const vectorLiteral = `[${vector.join(',')}]`;

        await tx.$executeRaw`
          INSERT INTO "DocumentChunk" (
            "id", "documentId", "userId", "chunkIndex", "content", "embedding", "createdAt"
          )
          VALUES (
            ${chunkId},
            ${documentId},
            ${userId},
            ${index},
            ${content},
            ${vectorLiteral}::vector,
            NOW()
          )
        `;
      }
    },
    { maxWait: 30000, timeout: 30000 }
  );

  return {
    documentId,
    chunkCount: chunks.length,
  };
}

/**
 * Retrieve top-k relevant chunks filtered strictly by userId and interview documentIds (RAG-2, RAG-4, RAG-6).
 * Never returns chunks belonging to another user.
 */
export async function retrieveRelevantChunks(
  params: RetrieveParams,
  client = defaultPrisma
): Promise<RetrievalChunkCandidate[]> {
  const {
    userId,
    query,
    documentIds,
    topK = RAG_TOP_K,
    maxTotalChars = RAG_MAX_TOTAL_CHARS,
  } = params;

  const normalizedQuery = query.trim();
  if (!normalizedQuery || !documentIds || documentIds.length === 0) {
    return [];
  }

  // 1. Embed query (RAG-6)
  const embeddingGen = getEmbeddingGenerator();
  const queryVector = await embeddingGen.embedQuery(normalizedQuery, { userId });
  const vectorLiteral = `[${queryVector.join(',')}]`;

  // 2. Query pgvector strictly scoped to userId AND documentId IN (documentIds) (RAG-2)
  const fetchLimit = Math.max(topK * 2, 8);
  const rows = await client.$queryRaw<
    Array<{
      id: string;
      documentId: string;
      content: string;
      distance: number;
    }>
  >`
    SELECT
      "id",
      "documentId",
      "content",
      ("embedding" <=> ${vectorLiteral}::vector) AS "distance"
    FROM "DocumentChunk"
    WHERE "userId" = ${userId}
      AND "documentId" = ANY(${documentIds})
      AND "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${vectorLiteral}::vector ASC
    LIMIT ${fetchLimit}
  `;

  // 3. Shape results with top-k and character budget caps (RAG-4)
  return shapeRetrievalResults(rows, maxTotalChars, topK);
}

/**
 * Validates that all selected interview documents exist, belong to user, and are READY with summaries (RAG-8, SEC-1).
 */
export async function validateDocumentsReady(
  documentIds: string[],
  userId: string,
  client = defaultPrisma
): Promise<void> {
  if (!documentIds || documentIds.length === 0) {
    return;
  }

  const docs = await client.uploadedDocument.findMany({
    where: {
      id: { in: documentIds },
    },
  });

  if (docs.length !== documentIds.length) {
    // If any document does not exist, return 404 (SEC-1)
    throw new AppError('NOT_FOUND', 'One or more requested documents were not found', 404);
  }

  for (const doc of docs) {
    if (doc.userId !== userId) {
      // Cross-user access returns 404 (SEC-1)
      throw new AppError('NOT_FOUND', 'One or more requested documents were not found', 404);
    }

    if (doc.status !== 'READY' || !doc.summaryJson) {
      // RAG-8: If an interview's document is not READY (or has no summary), starting is blocked with 422 DOCUMENT_NOT_READY
      throw new AppError(
        'DOCUMENT_NOT_READY',
        `Document "${doc.originalName || doc.id}" is not ready for interview rehearsal. Status: ${doc.status}`,
        422
      );
    }
  }
}
