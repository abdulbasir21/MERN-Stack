import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { chunkDocument } from '../domain/chunker.js';
import { getBatchEmbeddings } from '../ai/embeddingService.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * BR-C1, BR-C2, BR-C3: Index document chunks atomically in one transaction
 */
export async function indexDocumentChunks(ownerId, projectId, documentId, { text, pages = [] }) {
  const document = await Document.findOne({ _id: documentId, ownerId });
  if (!document) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);
  }

  // Set status to indexing
  document.processingStatus = 'indexing';
  await document.save();

  // 1. Chunk document
  const rawChunks = chunkDocument({ text, pages });
  if (rawChunks.length === 0) {
    document.processingStatus = 'ready';
    await document.save();
    return [];
  }

  // 2. Generate embeddings for all chunks
  const texts = rawChunks.map((c) => c.text);
  const embeddings = await getBatchEmbeddings(texts);

  // 3. Prepare chunk documents
  const chunkDocs = rawChunks.map((chunk, index) => ({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    projectId: new mongoose.Types.ObjectId(projectId),
    documentId: new mongoose.Types.ObjectId(documentId),
    documentCategory: document.category,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    pageNumber: chunk.pageNumber,
    sectionLabel: chunk.sectionLabel,
    embedding: embeddings[index]
  }));

  // 4. BR-C3: Atomic replacement in one transaction
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Delete existing chunks for this document
      await DocumentChunk.deleteMany({ documentId: document._id, ownerId }).session(session);

      // Insert new chunks
      if (chunkDocs.length > 0) {
        await DocumentChunk.insertMany(chunkDocs, { session });
      }

      // Mark document ready
      await Document.updateOne(
        { _id: document._id, ownerId },
        { processingStatus: 'ready', failureReason: null }
      ).session(session);
    });
  } finally {
    await session.endSession();
  }

  return chunkDocs;
}
