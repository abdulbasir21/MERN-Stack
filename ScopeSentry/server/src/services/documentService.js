import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { Investigation } from '../models/Investigation.js';
import { Project } from '../models/Project.js';
import { uploadPrivateFile, getPrivateDownloadUrl, deletePrivateFile } from '../integrations/storage.js';
import { extractDocumentText } from './textExtractionService.js';
import { indexDocumentChunks } from './indexingService.js';
import { sanitizeFilename } from '../utils/sanitizer.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES, DOCUMENT_CATEGORIES } from '../config/constants.js';

export async function uploadDocument(ownerId, projectId, { file, category, simulateDbFailure = false }) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  // Verify project ownership (BR-P4)
  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  // BR-D2: Validate document category enum
  if (!DOCUMENT_CATEGORIES.includes(category)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid document category: "${category}". Permitted: ${DOCUMENT_CATEGORIES.join(', ')}`,
      400
    );
  }

  // BR-D6: Sanitize original filename
  const cleanFilename = sanitizeFilename(file.originalname);

  // Step 1: Upload private file to ImageKit
  let uploadResult;
  try {
    uploadResult = await uploadPrivateFile({
      buffer: file.buffer,
      originalFilename: cleanFilename,
      folder: `/scopesentry/projects/${projectId}`
    });
  } catch (err) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `File storage upload failed: ${err.message}`, 500);
  }

  // Step 2: Create document record with pending status (BR-D3)
  let documentRecord;
  try {
    if (simulateDbFailure) {
      throw new Error('Simulated database failure for compensation test');
    }
    documentRecord = new Document({
      ownerId,
      projectId,
      category,
      originalFilename: cleanFilename,
      storedFileId: uploadResult.fileId,
      storedFilePath: uploadResult.filePath,
      mimeType: file.mimetype,
      sizeBytes: file.size || file.buffer.length,
      processingStatus: 'pending'
    });
    await documentRecord.save();
  } catch (dbErr) {
    // BR-D3 Compensation: delete uploaded ImageKit file if DB creation fails
    try {
      await deletePrivateFile(uploadResult.fileId);
    } catch {
      // Best-effort compensation
    }
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, `Failed to save document record: ${dbErr.message}`, 500);
  }

  // Step 3: Text extraction (BR-D3, BR-D4, BR-D9)
  try {
    documentRecord.processingStatus = 'extracting';
    await documentRecord.save();

    const extraction = await extractDocumentText({
      buffer: file.buffer,
      filename: cleanFilename
    });

    documentRecord.extractedText = extraction.text;
    documentRecord.pageCount = extraction.pageCount;
    await documentRecord.save();

    // Step 4: Index chunks atomically in a transaction (BR-C1, BR-C2, BR-C3)
    await indexDocumentChunks(ownerId, projectId, documentRecord._id, {
      text: extraction.text,
      pages: extraction.pages
    });
    documentRecord.processingStatus = 'ready';
    documentRecord.failureReason = null;
  } catch (extractErr) {
    // BR-D4, BR-D9: Save safe failure reason
    const failureReason =
      extractErr.code === 'no_extractable_text' ? 'no_extractable_text' : 'extraction_failed';
    documentRecord.processingStatus = 'failed';
    documentRecord.failureReason = failureReason;
    await documentRecord.save();
  }

  return documentRecord;
}

export async function listDocuments(ownerId, projectId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const query = { ownerId, projectId };
  if (options.category) {
    query.category = options.category;
  }
  if (options.processingStatus) {
    query.processingStatus = options.processingStatus;
  }

  const documents = await Document.find(query).sort({ createdAt: -1 });
  return documents;
}

export async function getDocumentById(ownerId, documentId) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);
  }

  const document = await Document.findOne({ _id: documentId, ownerId });
  if (!document) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);
  }

  return document;
}

/**
 * BR-D5: Authenticated download route returning short-lived private URL
 */
export async function getDocumentDownloadUrl(ownerId, documentId) {
  const document = await getDocumentById(ownerId, documentId);

  if (!document.storedFilePath) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Document storage file path not available', 404);
  }

  const downloadUrl = await getPrivateDownloadUrl(document.storedFilePath, 300);
  return {
    downloadUrl,
    filename: document.originalFilename,
    mimeType: document.mimeType
  };
}

/**
 * BR-D7: Deleting a document removes its chunks and the ImageKit file.
 * BLOCKED with 409 if referenced by an existing investigation.
 */
export async function deleteDocument(ownerId, documentId) {
  const document = await getDocumentById(ownerId, documentId);

  // BR-D7: Check if document is referenced by an existing investigation
  const referencingInvestigation = await Investigation.findOne({
    ownerId,
    $or: [
      { originalDocumentId: document._id },
      { revisedDocumentId: document._id },
      { supportingDocumentIds: document._id }
    ]
  });

  if (referencingInvestigation) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      'Cannot delete document referenced by an existing investigation. Delete the investigation first.',
      409
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Delete associated chunks
      await DocumentChunk.deleteMany({ documentId: document._id, ownerId }).session(session);
      // 2. Delete document record
      await Document.deleteOne({ _id: document._id, ownerId }).session(session);
    });
  } finally {
    await session.endSession();
  }

  // 3. Post-commit ImageKit file cleanup
  if (document.storedFileId) {
    try {
      await deletePrivateFile(document.storedFileId);
    } catch {
      // Recorded / safe log
    }
  }

  return {
    deletedDocumentId: documentId,
    success: true
  };
}

/**
 * Re-process a failed document (BR-D4)
 */
export async function reprocessDocument(ownerId, documentId, optionalBuffer = null) {
  const document = await getDocumentById(ownerId, documentId);

  if (['extracting', 'indexing'].includes(document.processingStatus)) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      'Document is currently being processed',
      409
    );
  }

  document.processingStatus = 'extracting';
  document.failureReason = null;
  await document.save();

  if (optionalBuffer) {
    try {
      const extraction = await extractDocumentText({
        buffer: optionalBuffer,
        filename: document.originalFilename
      });
      document.extractedText = extraction.text;
      document.pageCount = extraction.pageCount;
      document.processingStatus = 'ready';
      await document.save();
    } catch (err) {
      document.processingStatus = 'failed';
      document.failureReason = err.code === 'no_extractable_text' ? 'no_extractable_text' : 'extraction_failed';
      await document.save();
    }
  } else {
    // If no buffer passed, mark ready if already has text or failed
    if (document.extractedText && document.extractedText.trim()) {
      document.processingStatus = 'ready';
    } else {
      document.processingStatus = 'failed';
      document.failureReason = 'no_extractable_text';
    }
    await document.save();
  }

  return document;
}
