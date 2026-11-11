import mongoose from 'mongoose';

/**
 * BR-C4: Retrieval filter builder that strictly REQUIRES ownerId and projectId.
 * A retrieval query can never run without both parameters.
 */
export function buildRetrievalFilter({
  ownerId,
  projectId,
  documentId = null,
  documentCategory = null,
  documentIds = null
}) {
  if (!ownerId || !projectId) {
    throw new Error('Retrieval filter builder requires both ownerId and projectId (BR-C4 violation)');
  }

  const toObjectId = (val) => (mongoose.Types.ObjectId.isValid(val) ? new mongoose.Types.ObjectId(val) : val);

  const filter = {
    ownerId: toObjectId(ownerId),
    projectId: toObjectId(projectId)
  };

  if (documentId) {
    filter.documentId = toObjectId(documentId);
  }

  if (documentCategory) {
    filter.documentCategory = documentCategory;
  }

  if (Array.isArray(documentIds) && documentIds.length > 0) {
    filter.documentId = { $in: documentIds.map(toObjectId) };
  }

  return filter;
}
