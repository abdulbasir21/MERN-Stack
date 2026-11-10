import { describe, it, expect } from 'vitest';
import {
  buildOwnerScope,
  buildProjectScope,
  assertOwnership
} from '../../src/domain/ownership.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('Phase 1: Ownership Scoping & Validation', () => {
  it('buildOwnerScope returns object with ownerId string and extra filters', () => {
    const scope = buildOwnerScope('user_123', { status: 'active' });
    expect(scope).toEqual({
      ownerId: 'user_123',
      status: 'active'
    });
  });

  it('buildOwnerScope throws error if ownerId is missing or empty', () => {
    expect(() => buildOwnerScope(null)).toThrow('Ownership filter requires a valid ownerId');
    expect(() => buildOwnerScope('')).toThrow('Ownership filter requires a valid ownerId');
  });

  it('buildProjectScope returns object with ownerId and projectId', () => {
    const scope = buildProjectScope('user_123', 'proj_abc', { category: 'spec' });
    expect(scope).toEqual({
      ownerId: 'user_123',
      projectId: 'proj_abc',
      category: 'spec'
    });
  });

  it('BR-C4: buildProjectScope throws error if either ownerId or projectId is missing', () => {
    expect(() => buildProjectScope(null, 'proj_1')).toThrow('Project scope requires a valid ownerId');
    expect(() => buildProjectScope('user_1', null)).toThrow('Project scope requires a valid projectId');
  });

  it('assertOwnership returns the resource when ownerId matches', () => {
    const resource = { id: 'doc_1', ownerId: 'user_123', name: 'Contract.pdf' };
    const verified = assertOwnership(resource, 'user_123');
    expect(verified).toBe(resource);
  });

  it('assertOwnership throws 404 AppError when ownerId does not match (never 403 to prevent existence leakage)', () => {
    const resource = { id: 'doc_1', ownerId: 'user_999' };

    try {
      assertOwnership(resource, 'user_123');
      expect.unreachable('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Resource not found');
    }
  });

  it('assertOwnership throws 404 AppError when resource is null or undefined', () => {
    expect(() => assertOwnership(null, 'user_123')).toThrowError();
  });
});
