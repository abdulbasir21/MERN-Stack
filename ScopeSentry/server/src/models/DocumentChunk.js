import mongoose from 'mongoose';
import { DOCUMENT_CATEGORIES } from '../config/constants.js';

const documentChunkSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    documentCategory: {
      type: String,
      required: true,
      enum: DOCUMENT_CATEGORIES
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    pageNumber: {
      type: Number,
      default: null
    },
    sectionLabel: {
      type: String,
      default: null
    },
    embedding: {
      type: [Number],
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

documentChunkSchema.index({ ownerId: 1, projectId: 1, documentId: 1 });

export const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', documentChunkSchema);
export default DocumentChunk;
