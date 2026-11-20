import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Document } from '../models/Document.js';
import { Investigation } from '../models/Investigation.js';
import { Finding } from '../models/Finding.js';
import { computeInvestigationInputHash } from '../domain/inputHash.js';
import { executeInvestigationWorkflow } from '../ai/investigationWorkflow.js';
import { calculateFindingImpact } from '../domain/impactCalculator.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Returns all active public demo projects
 */
export async function getDemoProjects() {
  const projects = await Project.find({ isDemo: true, status: 'active' }).sort({ createdAt: 1 });
  return projects;
}

/**
 * Returns a specific demo project
 */
export async function getDemoProjectById(projectId) {
  const project = await Project.findOne({ _id: projectId, isDemo: true });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo project not found', 404);
  }
  return project;
}

/**
 * Lists ready documents for a demo project
 */
export async function getDemoProjectDocuments(projectId) {
  const project = await Project.findOne({ _id: projectId, isDemo: true });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo project not found', 404);
  }

  const documents = await Document.find({
    projectId: project._id,
    isDemo: true,
    processingStatus: 'ready'
  }).select('id originalFilename category mimeType sizeBytes pageCount extractedText isDemo createdAt');

  return documents;
}

/**
 * Retrieves demo document content
 */
export async function getDemoDocumentById(documentId) {
  const doc = await Document.findOne({ _id: documentId, isDemo: true });
  if (!doc) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo document not found', 404);
  }
  return doc;
}

/**
 * Runs a real AI investigation on demo documents with demoSessionId isolation
 */
export async function runDemoInvestigation({
  projectId,
  originalDocumentId,
  revisedDocumentId,
  supportingDocumentIds = [],
  demoSessionId
}) {
  const project = await Project.findOne({ _id: projectId, isDemo: true });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo project not found', 404);
  }

  const [origDoc, revDoc] = await Promise.all([
    Document.findOne({ _id: originalDocumentId, projectId, isDemo: true }),
    Document.findOne({ _id: revisedDocumentId, projectId, isDemo: true })
  ]);

  if (!origDoc || !revDoc) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo documents not found', 404);
  }

  // Generate or preserve demoSessionId
  const sessionId = demoSessionId || crypto.randomUUID();

  // Compute input hash
  const inputHash = computeInvestigationInputHash({
    projectId: String(project._id),
    originalDocumentId: String(origDoc._id),
    revisedDocumentId: String(revDoc._id),
    supportingDocumentIds
  });

  // Check if an existing demo investigation with this session exists
  const existing = await Investigation.findOne({
    projectId: project._id,
    inputHash,
    demoSessionId: sessionId,
    isDemo: true,
    status: 'completed'
  });

  if (existing) {
    const existingFindingsCount = await Finding.countDocuments({ investigationId: existing._id });
    if (existingFindingsCount > 0) {
      return {
        demoSessionId: sessionId,
        investigation: existing,
        isExisting: true
      };
    }
    // Remove stale 0-finding investigation so a fresh run executes cleanly
    await Investigation.deleteOne({ _id: existing._id });
  }

  // Load any supporting demo documents for this project (e.g. OAC Meeting Minutes)
  const supportingDocs = await Document.find({
    projectId: project._id,
    isDemo: true,
    _id: { $nin: [origDoc._id, revDoc._id] }
  });
  const effectiveSupportingIds = supportingDocumentIds.length > 0
    ? supportingDocumentIds
    : supportingDocs.map((d) => String(d._id));

  // Create demo investigation record
  const investigation = await Investigation.create({
    ownerId: null,
    projectId: project._id,
    originalDocumentId: origDoc._id,
    revisedDocumentId: revDoc._id,
    supportingDocumentIds: effectiveSupportingIds,
    inputHash,
    status: 'running',
    isDemo: true,
    demoSessionId: sessionId,
    startedAt: new Date()
  });

  try {
    const workflowOutput = await executeInvestigationWorkflow({
      ownerId: null,
      projectId: String(project._id),
      originalDoc: origDoc,
      revisedDoc: revDoc,
      supportingDocs
    });

    const rawFindings = workflowOutput.findings || [];

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (rawFindings.length > 0) {
          const findingDocs = rawFindings.map((f) => ({
            investigationId: investigation._id,
            ownerId: null,
            projectId: project._id,
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
    await Investigation.updateOne(
      { _id: investigation._id },
      {
        $set: {
          status: 'failed',
          failureReason: 'Demo investigation failed to execute workflow',
          finishedAt: new Date()
        }
      }
    );
  }

  const completed = await Investigation.findById(investigation._id);
  return {
    demoSessionId: sessionId,
    investigation: completed,
    isExisting: false
  };
}

/**
 * Retrieves findings for a demo investigation with dynamic impact math (Section 7)
 */
export async function getDemoInvestigationFindings(investigationId, demoSessionId) {
  const investigation = await Investigation.findOne({
    _id: investigationId,
    isDemo: true,
    ...(demoSessionId ? { demoSessionId } : {})
  });

  if (!investigation) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Demo investigation not found', 404);
  }

  const findings = await Finding.find({ investigationId }).sort({ createdAt: 1 });

  return findings.map((f) => {
    const obj = f.toJSON();
    const impact = calculateFindingImpact({
      originalQuantity: obj.originalValue,
      revisedQuantity: obj.revisedValue,
      extractedUnitPrice: obj.extractedUnitPrice,
      unitPriceOverride: obj.unitPriceOverride,
      originalDate: obj.scheduleInfo?.originalDate,
      revisedDate: obj.scheduleInfo?.revisedDate
    });

    return {
      ...obj,
      impact
    };
  });
}
