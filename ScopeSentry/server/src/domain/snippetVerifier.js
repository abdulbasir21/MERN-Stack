/**
 * BR-I8: Evidence Snippet Verification
 * Verifies that claimed evidence snippets exist inside real document chunks before persistence.
 */
export function normalizeTextForComparison(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verify if a snippet exists in the referenced chunk text
 * @param {string} snippet - The cited evidence snippet
 * @param {string} chunkText - The full text of the referenced chunk
 * @returns {{ verified: boolean, exactMatch?: boolean, reason?: string }}
 */
export function verifySnippetInChunk(snippet, chunkText) {
  if (!snippet || typeof snippet !== 'string' || !snippet.trim()) {
    return { verified: false, reason: 'Snippet is empty or invalid' };
  }
  if (!chunkText || typeof chunkText !== 'string' || !chunkText.trim()) {
    return { verified: false, reason: 'Referenced chunk text is empty' };
  }

  // 1. Check exact raw substring match
  if (chunkText.includes(snippet.trim())) {
    return { verified: true, exactMatch: true };
  }

  // 2. Check normalized whitespace & case-insensitive match
  const normSnippet = normalizeTextForComparison(snippet);
  const normChunk = normalizeTextForComparison(chunkText);

  if (normChunk.includes(normSnippet)) {
    return { verified: true, exactMatch: false };
  }

  // If snippet not found, reject as unverified citation
  return {
    verified: false,
    reason: 'Snippet text does not exist within the referenced chunk'
  };
}
