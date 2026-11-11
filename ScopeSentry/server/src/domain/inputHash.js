import crypto from 'node:crypto';

/**
 * Computes deterministic inputHash for duplicate investigation prevention (BR-I3)
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.originalDocumentId
 * @param {string} params.revisedDocumentId
 * @param {string[]} [params.supportingDocumentIds]
 * @returns {string} SHA-256 hex digest
 */
export function computeInvestigationInputHash({
  projectId,
  originalDocumentId,
  revisedDocumentId,
  supportingDocumentIds = []
}) {
  if (!projectId || !originalDocumentId || !revisedDocumentId) {
    throw new Error('computeInvestigationInputHash requires projectId, originalDocumentId, and revisedDocumentId');
  }

  // Normalize supporting document IDs (unique, stringified, sorted alphabetically)
  const normalizedSupporting = Array.isArray(supportingDocumentIds)
    ? [...new Set(supportingDocumentIds.map((id) => String(id)).filter(Boolean))].sort()
    : [];

  const payload = JSON.stringify({
    projectId: String(projectId),
    originalDocumentId: String(originalDocumentId),
    revisedDocumentId: String(revisedDocumentId),
    supportingDocumentIds: normalizedSupporting
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}
