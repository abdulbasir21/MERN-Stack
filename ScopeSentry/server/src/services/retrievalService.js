import { DocumentChunk } from '../models/DocumentChunk.js';
import { buildRetrievalFilter } from '../domain/retrievalFilter.js';
import { getEmbedding } from '../ai/embeddingService.js';
import { reciprocalRankFusion } from '../domain/rrf.js';

/**
 * Compute cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Execute vector search with strict scoping (BR-C4)
 */
async function executeVectorSearch(filter, queryVector, limit) {
  try {
    // Atlas Vector Search aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector,
          numCandidates: limit * 10,
          limit,
          filter: {
            ownerId: filter.ownerId,
            projectId: filter.projectId,
            ...(filter.documentId && { documentId: filter.documentId }),
            ...(filter.documentCategory && { documentCategory: filter.documentCategory })
          }
        }
      }
    ];
    const atlasResults = await DocumentChunk.aggregate(pipeline);
    if (atlasResults && atlasResults.length > 0) {
      return atlasResults;
    }
  } catch {
    // Atlas index unavailable or error occurred
  }

  // Scoped fallback: in-memory cosine similarity over scoped database records (BR-C4)
  const scopedChunks = await DocumentChunk.find(filter).lean();
  const scored = scopedChunks
    .filter((chunk) => Array.isArray(chunk.embedding))
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.embedding)
    }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Execute keyword search with strict scoping (BR-C4)
 */
async function executeKeywordSearch(filter, query, limit) {
  try {
    // Atlas Search aggregation pipeline
    const pipeline = [
      {
        $search: {
          index: 'keyword_index',
          compound: {
            must: [
              {
                text: {
                  query,
                  path: 'text'
                }
              }
            ],
            filter: [
              { equals: { path: 'ownerId', value: filter.ownerId } },
              { equals: { path: 'projectId', value: filter.projectId } },
              ...(filter.documentId ? [{ equals: { path: 'documentId', value: filter.documentId } }] : []),
              ...(filter.documentCategory ? [{ equals: { path: 'documentCategory', value: filter.documentCategory } }] : [])
            ]
          }
        }
      },
      { $limit: limit }
    ];
    const atlasResults = await DocumentChunk.aggregate(pipeline);
    if (atlasResults && atlasResults.length > 0) {
      return atlasResults;
    }
  } catch {
    // Atlas index unavailable or error occurred
  }

  // Scoped fallback: regex and token overlap scoring over scoped chunks (BR-C4)
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const scopedChunks = await DocumentChunk.find(filter).lean();

    const scored = scopedChunks.map((chunk) => {
      const lowerText = chunk.text.toLowerCase();
      let matchCount = 0;

      // Exact phrase match bonus
      if (lowerText.includes(query.toLowerCase())) {
        matchCount += 10;
      }

      // Individual keyword match
      for (const term of terms) {
        if (lowerText.includes(term)) {
          matchCount += 1;
        }
      }

      return {
        ...chunk,
        keywordScore: matchCount
      };
    });

    const filtered = scored.filter((c) => c.keywordScore > 0);
    filtered.sort((a, b) => b.keywordScore - a.keywordScore);
    return filtered.slice(0, limit);
}

/**
 * BR-C4: Hybrid retrieval service strictly enforcing ownerId and projectId scoping
 * Combines vector search and keyword search via Reciprocal Rank Fusion (RRF)
 */
export async function hybridRetrieval({
  ownerId,
  projectId,
  query,
  documentId = null,
  documentCategory = null,
  documentIds = null,
  limit = 10
}) {
  // Enforces BR-C4: throws if ownerId or projectId is missing
  const scopedFilter = buildRetrievalFilter({
    ownerId,
    projectId,
    documentId,
    documentCategory,
    documentIds
  });

  const queryVector = await getEmbedding(query);

  // Run vector and keyword searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    executeVectorSearch(scopedFilter, queryVector, limit * 2),
    executeKeywordSearch(scopedFilter, query, limit * 2)
  ]);

  // Reciprocal Rank Fusion
  const fusedResults = reciprocalRankFusion(
    [
      { name: 'vector', items: vectorResults },
      { name: 'keyword', items: keywordResults }
    ],
    60
  );

  return fusedResults.slice(0, limit).map((f) => ({
    ...f.item,
    id: f.id,
    rrfScore: f.rrfScore,
    ranks: f.ranks
  }));
}
