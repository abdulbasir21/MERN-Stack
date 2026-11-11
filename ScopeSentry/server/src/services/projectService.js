import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { Investigation } from '../models/Investigation.js';
import { Finding } from '../models/Finding.js';
import { ReviewAction } from '../models/ReviewAction.js';
import { Report } from '../models/Report.js';
import { calendarDateDiffDays, isValidCalendarDate } from '../domain/dates.js';
import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export function validateDateOrdering(startDate, expectedCompletionDate) {
  if (startDate && !isValidCalendarDate(startDate)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid startDate (expected YYYY-MM-DD)', 400);
  }
  if (expectedCompletionDate && !isValidCalendarDate(expectedCompletionDate)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid expectedCompletionDate (expected YYYY-MM-DD)', 400);
  }
  if (startDate && expectedCompletionDate) {
    const diff = calendarDateDiffDays(startDate, expectedCompletionDate);
    if (diff < 0) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Expected completion date must be on or after start date', 400);
    }
  }
}

export async function createProject(ownerId, data) {
  const {
    name,
    description = '',
    projectType,
    location = '',
    budget = null,
    currency = 'USD',
    startDate = null,
    expectedCompletionDate = null
  } = data;

  validateDateOrdering(startDate, expectedCompletionDate);

  const project = new Project({
    ownerId,
    name,
    description,
    projectType,
    location,
    budget,
    currency: currency.toUpperCase(),
    startDate,
    expectedCompletionDate,
    status: 'active'
  });

  await project.save();
  return project;
}

export async function listProjects(ownerId, options = {}) {
  const page = Math.max(1, parseInt(options.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(options.limit || '20', 10)));
  const skip = (page - 1) * limit;

  const query = { ownerId };
  if (options.status) {
    query.status = options.status;
  }
  if (options.search) {
    const regex = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { description: regex }, { location: regex }];
  }

  const [total, projects] = await Promise.all([
    Project.countDocuments(query),
    Project.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  return {
    projects,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getProjectById(ownerId, projectId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  return project;
}

export async function updateProject(ownerId, projectId, updateData) {
  const project = await getProjectById(ownerId, projectId);

  // BR-P6: Archived projects are read-only except unarchive (status -> active)
  if (project.status === 'archived' && updateData.status !== 'active') {
    throw new AppError(ERROR_CODES.CONFLICT, 'Archived project is read-only. Unarchive before making edits.', 409);
  }

  // Determine effective dates to validate ordering (BR-P2)
  const effectiveStart = updateData.startDate !== undefined ? updateData.startDate : project.startDate;
  const effectiveEnd =
    updateData.expectedCompletionDate !== undefined
      ? updateData.expectedCompletionDate
      : project.expectedCompletionDate;

  validateDateOrdering(effectiveStart, effectiveEnd);

  // Allowed fields to update
  const allowedFields = [
    'name',
    'description',
    'projectType',
    'location',
    'budget',
    'currency',
    'startDate',
    'expectedCompletionDate',
    'status'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'currency' && typeof updateData[field] === 'string') {
        project[field] = updateData[field].toUpperCase();
      } else {
        project[field] = updateData[field];
      }
    }
  }

  await project.save();
  return project;
}

/**
 * BR-P5: Deleting a project deletes all its documents (including ImageKit files),
 * chunks, investigations, findings, review actions, and reports.
 * The database part runs in ONE transaction; ImageKit deletions run after commit.
 */
export async function deleteProjectCascade(ownerId, projectId, options = {}) {
  const project = await getProjectById(ownerId, projectId);

  const session = await mongoose.startSession();
  const fileIdsToClean = [];

  try {
    await session.withTransaction(async () => {
      // 1. Collect all documents for this project to retrieve stored file IDs for post-commit cleanup
      const documents = await Document.find({ projectId: project._id, ownerId }).session(session);
      for (const doc of documents) {
        if (doc.storedFileId) {
          fileIdsToClean.push(doc.storedFileId);
        }
      }

      // 2. Cascade delete in dependency order
      // Collect finding IDs for this project
      const projectFindings = await Finding.find({ projectId: project._id, ownerId }, { _id: 1 }).session(session);
      const findingIds = projectFindings.map((f) => f._id);
      if (findingIds.length > 0) {
        await ReviewAction.deleteMany({ findingId: { $in: findingIds } }).session(session);
      }

      // Findings
      await Finding.deleteMany({ projectId: project._id, ownerId }).session(session);
      // Reports
      await Report.deleteMany({ projectId: project._id, ownerId }).session(session);
      // Document chunks
      await DocumentChunk.deleteMany({ projectId: project._id, ownerId }).session(session);
      // Investigations
      await Investigation.deleteMany({ projectId: project._id, ownerId }).session(session);
      // Documents
      await Document.deleteMany({ projectId: project._id, ownerId }).session(session);

      // Simulation hook for transactional rollback testing (BR-P5)
      if (options.simulateFailure) {
        throw new Error('Simulated failure during cascade delete transaction');
      }

      // Finally delete the project itself
      await Project.deleteOne({ _id: project._id, ownerId }).session(session);
    });
  } finally {
    await session.endSession();
  }

  // Hook for ImageKit cleanup (stubbed until Phase 4 integration)
  return {
    deletedProjectId: projectId,
    filesMarkedForCleanup: fileIdsToClean
  };
}
