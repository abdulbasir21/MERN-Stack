import { CHUNK_CONSTANTS } from '../config/constants.js';

/**
 * Reciprocal Rank Fusion (RRF) for merging vector and keyword search results
 * @param {Array<{ name: string, items: Array<{ id: string, [key: string]: any }> }>} rankedLists
 * @param {number} [k=60] - RRF smoothing parameter
 * @returns {Array<{ id: string, item: any, rrfScore: number, ranks: Record<string, number> }>}
 */
export function reciprocalRankFusion(rankedLists, k = CHUNK_CONSTANTS.RRF_K) {
  if (!Array.isArray(rankedLists) || rankedLists.length === 0) {
    return [];
  }

  const scoreMap = new Map();

  for (const list of rankedLists) {
    const listName = list.name || 'unnamed';
    const items = list.items || [];

    items.forEach((item, index) => {
      const id = String(item.id || item._id);
      const rank = index + 1; // 1-based rank
      const scoreContribution = 1 / (k + rank);

      if (!scoreMap.has(id)) {
        scoreMap.set(id, {
          id,
          item,
          rrfScore: 0,
          ranks: {}
        });
      }

      const entry = scoreMap.get(id);
      entry.rrfScore += scoreContribution;
      entry.ranks[listName] = rank;
    });
  }

  const fused = Array.from(scoreMap.values());

  // Sort descending by rrfScore; break ties deterministically by ID
  fused.sort((a, b) => {
    if (b.rrfScore !== a.rrfScore) {
      return b.rrfScore - a.rrfScore;
    }
    return a.id.localeCompare(b.id);
  });

  return fused;
}
