import mongoose from 'mongoose';
import { Investigation } from '../models/Investigation.js';
import { Finding } from '../models/Finding.js';
import { Document } from '../models/Document.js';
import { Project } from '../models/Project.js';
import { ReviewAction } from '../models/ReviewAction.js';
import { Report } from '../models/Report.js';
import { computeInvestigationInputHash } from '../domain/inputHash.js';
import { executeInvestigationWorkflow } from '../ai/investigationWorkflow.js';
import { calculateFindingImpact } from '../domain/impactCalculator.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

const ALLOWED_ORIGINAL_CATEGORIES = ['original_specification', 'original_contract'];
const ALLOWED_REVISED_CATEGORIES = ['revised_specification', 'change_request'];

/**
 * Creates or retrieves an active duplicate investigation (BR-I1, BR-I2, BR-I3)
 */
export async function createInvestigation({
  ownerId,
  projectId,
  originalDocumentId,
  revisedDocumentId,
  supportingDocumentIds = []
}) {
  // 1. Verify project exists and is owned by user
  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  // 2. Fetch and validate original document (BR-I1, BR-I2)
  const originalDoc = await Document.findOne({ _id: originalDocumentId, projectId, ownerId });
  if (!originalDoc) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Original document not found or does not belong to project', 404);
  }
  if (originalDoc.processingStatus !== 'ready') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Original document is not ready for investigation', 400);
  }
  if (!ALLOWED_ORIGINAL_CATEGORIES.includes(originalDoc.category)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Original document category must be one of: ${ALLOWED_ORIGINAL_CATEGORIES.join(', ')}`,
      400
    );
  }

  // 3. Fetch and validate revised document (BR-I1, BR-I2)
  const revisedDoc = await Document.findOne({ _id: revisedDocumentId, projectId, ownerId });
  if (!revisedDoc) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Revised document not found or does not belong to project', 404);
  }
  if (revisedDoc.processingStatus !== 'ready') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Revised document is not ready for investigation', 400);
  }
  if (!ALLOWED_REVISED_CATEGORIES.includes(revisedDoc.category)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Revised document category must be one of: ${ALLOWED_REVISED_CATEGORIES.join(', ')}`,
      400
    );
  }

  // 4. Fetch and validate supporting documents (BR-I1)
  const suppDocIds = Array.isArray(supportingDocumentIds)
    ? [...new Set(supportingDocumentIds.map((id) => String(id)).filter(Boolean))]
    : [];

  let supportingDocs = [];
  if (suppDocIds.length > 0) {
    supportingDocs = await Document.find({
      _id: { $in: suppDocIds },
      projectId,
      ownerId
    });

    if (supportingDocs.length !== suppDocIds.length) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'One or more supporting documents not found', 404);
    }

    const notReady = supportingDocs.find((d) => d.processingStatus !== 'ready');
    if (notReady) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Supporting document "${notReady.originalFilename}" is not ready`,
        400
      );
    }
  }

  // 5. Compute deterministic input hash (BR-I3)
  const inputHash = computeInvestigationInputHash({
    projectId,
    originalDocumentId,
    revisedDocumentId,
    supportingDocumentIds: suppDocIds
  });

  // 6. Check for active duplicate investigation (status queued or running)
  const existingActive = await Investigation.findOne({
    inputHash,
    status: { $in: ['queued', 'running'] }
  });

  if (existingActive) {
    return {
      isExisting: true,
      investigation: existingActive
    };
  }

  // 7. Create investigation record
  let newInvestigation;
  try {
    newInvestigation = await Investigation.create({
      ownerId,
      projectId,
      originalDocumentId,
      revisedDocumentId,
      supportingDocumentIds: suppDocIds,
      inputHash,
      status: 'queued',
      startedAt: new Date()
    });
  } catch (err) {
    // Handle concurrent duplicate insertion race condition (Mongo duplicate key on inputHash partial index)
    if (err.code === 11000) {
      const raced = await Investigation.findOne({
        inputHash,
        status: { $in: ['queued', 'running'] }
      });
      if (raced) {
        return { isExisting: true, investigation: raced };
      }
    }
    throw err;
  }

  // 8. Launch investigation workflow in background (in-process runner)
  setImmediate(() => {
    runInvestigation(newInvestigation._id).catch((err) => {
      console.error(`Investigation ${newInvestigation._id} error:`, err.message);
    });
  });

  return {
    isExisting: false,
    investigation: newInvestigation
  };
}

/**
 * Runs the investigation workflow in-process (BR-I4, BR-I6)
 * Results are saved in one database transaction (MASTER_PROMPT section 8 #8).
 */
export async function runInvestigation(investigationId) {
  const investigation = await Investigation.findById(investigationId);
  if (!investigation) return;

  investigation.status = 'running';
  investigation.startedAt = new Date();
  await investigation.save();

  try {
    const originalDoc = await Document.findById(investigation.originalDocumentId);
    const revisedDoc = await Document.findById(investigation.revisedDocumentId);
    const supportingDocs = await Document.find({
      _id: { $in: investigation.supportingDocumentIds }
    });

    const workflowOutput = await executeInvestigationWorkflow({
      ownerId: investigation.ownerId ? String(investigation.ownerId) : null,
      projectId: String(investigation.projectId),
      originalDoc,
      revisedDoc,
      supportingDocs
    });

    const rawFindings = workflowOutput.findings || [];

    // Save findings and mark investigation completed in ONE database transaction
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (rawFindings.length > 0) {
          const findingDocs = rawFindings.map((f) => ({
            investigationId: investigation._id,
            ownerId: investigation.ownerId,
            projectId: investigation.projectId,
            title: f.title,
            category: f.category,
            originalValue: f.originalValue || '',
            revisedValue: f.revisedValue || '',
            unit: f.unit || '',
            extractedUnitPrice: f.extractedUnitPrice !== null ? f.extractedUnitPrice : null,
            unitPriceOverride: null,
            description: f.description || '',
            evidence: f.evidence || [],
            approvalEvidence: f.approvalEvidence || { status: 'not_found', evidence: [] },
            scheduleInfo: f.scheduleInfo || null,
            confidence: f.confidence || 'medium',
            uncertaintyNote: f.uncertaintyNote || '',
            reviewStatus: 'pending',
            flags: f.flags || []
          }));

          await Finding.insertMany(findingDocs, { session });
        }

        await Investigation.updateOne(
          { _id: investigation._id },
          {
            $set: {
              status: 'completed',
              finishedAt: new Date()
            }
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  } catch {
    // Fail safely without exposing stack traces
    await Investigation.updateOne(
      { _id: investigation._id },
      {
        $set: {
          status: 'failed',
          failureReason: 'Investigation processing encountered an error',
          finishedAt: new Date()
        }
      }
    );
  }
}

/**
 * Cleans up stale investigations on server startup (BR-I4)
 */
export async function cleanupStaleInvestigations(maxMinutes = 15) {
  const cutoff = new Date(Date.now() - maxMinutes * 60 * 1000);
  const result = await Investigation.updateMany(
    {
      status: 'running',
      startedAt: { $lt: cutoff }
    },
    {
      $set: {
        status: 'failed',
        failureReason: 'interrupted',
        finishedAt: new Date()
      }
    }
  );
  return result.modifiedCount;
}

/**
 * Retrieves an investigation with owner scope check
 */
export async function getInvestigationById(investigationId, ownerId) {
  const query = { _id: investigationId };
  if (ownerId) query.ownerId = ownerId;

  const investigation = await Investigation.findOne(query)
    .populate('originalDocumentId', 'originalFilename category pageCount')
    .populate('revisedDocumentId', 'originalFilename category pageCount')
    .populate('supportingDocumentIds', 'originalFilename category pageCount');

  if (!investigation) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Investigation not found', 404);
  }

  return investigation;
}

/**
 * Lists investigations for a project with owner scoping
 */
export async function listProjectInvestigations({
  projectId,
  ownerId,
  page = 1,
  limit = 20
}) {
  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const query = { projectId, ownerId };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Investigation.find(query)
      .populate('originalDocumentId', 'originalFilename category')
      .populate('revisedDocumentId', 'originalFilename category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Investigation.countDocuments(query)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Retrieves findings for an investigation with dynamic impact calculation on read (Section 7)
 */
export async function getInvestigationFindings(investigationId, ownerId) {
  const query = { _id: investigationId };
  if (ownerId) query.ownerId = ownerId;

  const investigation = await Investigation.findOne(query);
  if (!investigation) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Investigation not found', 404);
  }

  const findings = await Finding.find({ investigationId }).sort({ createdAt: 1 });

  // Compute derived mathematical impacts dynamically on read (Section 7)
  const computedFindings = findings.map((finding) => {
    const findingObj = finding.toJSON();

    const impact = calculateFindingImpact({
      originalQuantity: findingObj.originalValue,
      revisedQuantity: findingObj.revisedValue,
      extractedUnitPrice: findingObj.extractedUnitPrice,
      unitPriceOverride: findingObj.unitPriceOverride,
      originalDate: findingObj.scheduleInfo?.originalDate,
      revisedDate: findingObj.scheduleInfo?.revisedDate
    });

    return {
      ...findingObj,
      impact: {
        quantityDifference: impact.quantityDifference,
        percentChange: impact.percentChange,
        activeUnitPrice: impact.activeUnitPrice,
        unitPriceSource: impact.unitPriceSource,
        estimatedCostDifference: impact.estimatedCostDifference,
        costEstimateNote: impact.costEstimateNote,
        priceDelta: impact.priceDelta,
        scheduleDifferenceDays: impact.scheduleDifferenceDays,
        scheduleNote: impact.scheduleNote
      }
    };
  });

  return computedFindings;
}

/**
 * Cascade deletes an investigation and its associated findings, review actions, and reports in one transaction
 */
export async function deleteInvestigation(investigationId, ownerId) {
  const query = { _id: investigationId };
  if (ownerId) query.ownerId = ownerId;

  const investigation = await Investigation.findOne(query);
  if (!investigation) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Investigation not found', 404);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Finding.deleteMany({ investigationId }, { session });
      await ReviewAction.deleteMany({ investigationId }, { session });
      await Report.deleteMany({ investigationId }, { session });
      await Investigation.deleteOne({ _id: investigationId }, { session });
    });
  } finally {
    await session.endSession();
  }

  return { success: true };
}
