import type {
  CvSummary,
  DocumentResponseDto,
  DocumentType,
  JdSummary,
} from '@interviewpilot/shared';
import type { UploadedDocument } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { validateUploadedDocumentFile } from '../../lib/fileValidation.js';
import { getStorageAdapter } from '../../services/storage/imagekitAdapter.js';
import { extractTextFromBuffer } from '../../services/documents/textExtractor.js';
import { executeDocumentSummary } from '../../services/documents/documentSummaryService.js';
import { indexDocumentChunks } from '../../services/rag/ragService.js';

export const MAX_DOCUMENTS_PER_TYPE = 5;

export function toDocumentResponseDto(doc: UploadedDocument): DocumentResponseDto {
  return {
    id: doc.id,
    type: doc.type,
    sourceKind: doc.sourceKind,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    status: doc.status,
    failureReason: doc.failureReason,
    summary: (doc.summaryJson as CvSummary | JdSummary) || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function uploadUserDocument(params: {
  userId: string;
  isDemo: boolean;
  type: DocumentType;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<DocumentResponseDto> {
  // DOC-4: Demo visitors cannot upload
  if (params.isDemo) {
    throw new AppError(
      'DEMO_RESTRICTED',
      'Document uploads are not available in demo mode.',
      403
    );
  }

  // DOC-2 & SEC-5: Magic byte and size validation (throws AppError('INVALID_FILE', ..., 400) on failure)
  validateUploadedDocumentFile({
    originalName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes: params.fileBuffer.length,
    buffer: params.fileBuffer,
  });

  // DOC-4: Max 5 documents per type per user
  const existingCount = await prisma.uploadedDocument.count({
    where: {
      userId: params.userId,
      type: params.type,
    },
  });

  if (existingCount >= MAX_DOCUMENTS_PER_TYPE) {
    throw new AppError(
      'VALIDATION_ERROR',
      `You have reached the maximum limit of ${MAX_DOCUMENTS_PER_TYPE} ${params.type} documents. Please delete an older document before uploading a new one.`,
      422
    );
  }

  // DOC-3: Upload to private storage adapter
  const storage = getStorageAdapter();
  const uploadResult = await storage.uploadPrivateFile(
    params.userId,
    params.fileBuffer,
    params.fileName
  );

  // Status flow starts at UPLOADED (DOC-5)
  const initialDoc = await prisma.uploadedDocument.create({
    data: {
      userId: params.userId,
      type: params.type,
      sourceKind: 'FILE',
      originalName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.fileBuffer.length,
      storageFileId: uploadResult.fileId,
      status: 'UPLOADED',
    },
  });

  // Transition to PROCESSING
  await prisma.uploadedDocument.update({
    where: { id: initialDoc.id },
    data: { status: 'PROCESSING' },
  });

  // Extract text locally (no AI, DOC-6)
  const extraction = await extractTextFromBuffer(params.fileBuffer, params.mimeType);

  if (!extraction.ok || !extraction.text) {
    // DOC-9: A PDF with no extractable text -> status FAILED, reason NO_TEXT
    const failedDoc = await prisma.uploadedDocument.update({
      where: { id: initialDoc.id },
      data: {
        status: 'FAILED',
        failureReason: extraction.reason || 'NO_TEXT',
      },
    });
    return toDocumentResponseDto(failedDoc);
  }

  // AI summary through withAiUsage (QTA-1, DOC-5, DOC-6)
  try {
    const summary = await executeDocumentSummary({
      userId: params.userId,
      documentId: initialDoc.id,
      text: extraction.text,
      type: params.type,
    });

    // RAG-6: Chunk and embed document once at processing time
    await indexDocumentChunks(initialDoc.id, params.userId, extraction.text);

    const readyDoc = await prisma.uploadedDocument.update({
      where: { id: initialDoc.id },
      data: {
        status: 'READY',
        failureReason: null,
        summaryJson: summary as object,
      },
    });

    return toDocumentResponseDto(readyDoc);
  } catch (aiErr) {
    console.warn('[DOC_PROCESSING] AI summary failed:', aiErr);
    const failedDoc = await prisma.uploadedDocument.update({
      where: { id: initialDoc.id },
      data: {
        status: 'FAILED',
        failureReason: 'PROCESSING_FAILED',
      },
    });
    return toDocumentResponseDto(failedDoc);
  }
}

export async function pasteJdDocument(params: {
  userId: string;
  isDemo: boolean;
  pastedText: string;
  originalName?: string;
}): Promise<DocumentResponseDto> {
  // DOC-4: Demo visitors cannot upload or paste documents
  if (params.isDemo) {
    throw new AppError(
      'DEMO_RESTRICTED',
      'Document uploads are not available in demo mode.',
      403
    );
  }

  // DOC-1: Pasted JD max 15,000 characters
  const trimmedText = params.pastedText.trim();
  if (trimmedText.length > 15000) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Pasted job description must not exceed 15,000 characters.',
      400
    );
  }
  if (trimmedText.length < 10) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Pasted job description must be at least 10 characters long.',
      400
    );
  }

  // Check 5 limit for JD (DOC-4)
  const existingCount = await prisma.uploadedDocument.count({
    where: {
      userId: params.userId,
      type: 'JD',
    },
  });

  if (existingCount >= MAX_DOCUMENTS_PER_TYPE) {
    throw new AppError(
      'VALIDATION_ERROR',
      `You have reached the maximum limit of ${MAX_DOCUMENTS_PER_TYPE} JD documents.`,
      422
    );
  }

  // Create document in PROCESSING state
  const initialDoc = await prisma.uploadedDocument.create({
    data: {
      userId: params.userId,
      type: 'JD',
      sourceKind: 'PASTED',
      originalName: params.originalName?.trim() || 'Pasted Job Description',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(trimmedText, 'utf8'),
      pastedText: trimmedText,
      status: 'PROCESSING',
    },
  });

  try {
    const summary = await executeDocumentSummary({
      userId: params.userId,
      documentId: initialDoc.id,
      text: trimmedText,
      type: 'JD',
    });

    // RAG-6: Chunk and embed document once at processing time
    await indexDocumentChunks(initialDoc.id, params.userId, trimmedText);

    const readyDoc = await prisma.uploadedDocument.update({
      where: { id: initialDoc.id },
      data: {
        status: 'READY',
        failureReason: null,
        summaryJson: summary as object,
      },
    });

    return toDocumentResponseDto(readyDoc);
  } catch (aiErr) {
    console.warn('[DOC_PROCESSING] Pasted JD AI summary failed:', aiErr);
    const failedDoc = await prisma.uploadedDocument.update({
      where: { id: initialDoc.id },
      data: {
        status: 'FAILED',
        failureReason: 'PROCESSING_FAILED',
      },
    });
    return toDocumentResponseDto(failedDoc);
  }
}

export async function listUserDocuments(
  userId: string,
  typeFilter?: DocumentType
): Promise<DocumentResponseDto[]> {
  const docs = await prisma.uploadedDocument.findMany({
    where: {
      userId,
      ...(typeFilter ? { type: typeFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(toDocumentResponseDto);
}

export async function getUserDocumentById(
  actorUserId: string,
  documentId: string,
  isAdmin = false
): Promise<DocumentResponseDto> {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
  });

  // DOC-8: User B gets 404 on User A's document
  if (!doc || (!isAdmin && doc.userId !== actorUserId)) {
    throw new AppError('NOT_FOUND', 'Document not found.', 404);
  }

  return toDocumentResponseDto(doc);
}

export async function getDocumentContentStream(
  actorUserId: string,
  documentId: string,
  isAdmin = false
): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
  });

  // DOC-8: User B gets 404 on User A's document
  if (!doc || (!isAdmin && doc.userId !== actorUserId)) {
    throw new AppError('NOT_FOUND', 'Document not found.', 404);
  }

  if (doc.sourceKind === 'PASTED') {
    const content = doc.pastedText || '';
    return {
      buffer: Buffer.from(content, 'utf8'),
      mimeType: 'text/plain',
      originalName: `${doc.originalName || 'pasted-jd'}.txt`,
    };
  }

  if (!doc.storageFileId) {
    throw new AppError('NOT_FOUND', 'Document file is unavailable.', 404);
  }

  const storage = getStorageAdapter();
  const buffer = await storage.getFileBuffer(doc.storageFileId);

  return {
    buffer,
    mimeType: doc.mimeType || 'application/octet-stream',
    originalName: doc.originalName || 'downloaded-file',
  };
}

export async function deleteUserDocument(
  actorUserId: string,
  documentId: string,
  isAdmin = false
): Promise<void> {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
  });

  // DOC-8: User B gets 404 on User A's document
  if (!doc || (!isAdmin && doc.userId !== actorUserId)) {
    throw new AppError('NOT_FOUND', 'Document not found.', 404);
  }

  // DOC-7: Delete file from storage
  if (doc.storageFileId) {
    const storage = getStorageAdapter();
    await storage.deleteFile(doc.storageFileId);
  }

  // Delete document row in DB (cascades to chunks in Phase 5)
  await prisma.uploadedDocument.delete({
    where: { id: documentId },
  });
}
