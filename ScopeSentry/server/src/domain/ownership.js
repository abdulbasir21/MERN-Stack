import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Builds an owner-scoped query filter.
 * Every private retrieval/mutation MUST use an owner scope.
 */
export function buildOwnerScope(ownerId, extra = {}) {
  if (!ownerId) {
    throw new Error('Ownership filter requires a valid ownerId');
  }
  return {
    ownerId: ownerId.toString(),
    ...extra
  };
}

/**
 * BR-C4: Every retrieval query MUST apply ownerId and projectId filters.
 * A retrieval function that cannot receive ownerId and projectId must not exist.
 */
export function buildProjectScope(ownerId, projectId, extra = {}) {
  if (!ownerId) {
    throw new Error('Project scope requires a valid ownerId');
  }
  if (!projectId) {
    throw new Error('Project scope requires a valid projectId');
  }
  return {
    ownerId: ownerId.toString(),
    projectId: projectId.toString(),
    ...extra
  };
}

/**
 * Asserts that a loaded resource belongs to the current user.
 * Foreign or unknown id -> 404 Not Found (never 403) to prevent existence leakage.
 */
export function assertOwnership(resource, ownerId) {
  if (!resource) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Resource not found', 404);
  }

  const resourceOwnerId = resource.ownerId ? resource.ownerId.toString() : null;
  const currentUserId = ownerId ? ownerId.toString() : null;

  if (!resourceOwnerId || resourceOwnerId !== currentUserId) {
    // Return 404 to obscure existence of other users' data
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Resource not found', 404);
  }

  return resource;
}
