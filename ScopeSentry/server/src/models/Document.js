import mongoose from 'mongoose';
import { DOCUMENT_CATEGORIES, DOCUMENT_PROCESSING_STATUSES } from '../config/constants.js';

const documentSchema = new mongoose.Schema(
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
    category: {
      type: String,
      required: true,
      enum: DOCUMENT_CATEGORIES
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    storedFileId: {
      type: String,
      default: null
    },
    storedFilePath: {
      type: String,
      default: null
    },
    mimeType: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    processingStatus: {
      type: String,
      required: true,
      enum: DOCUMENT_PROCESSING_STATUSES,
      default: 'pending',
      index: true
    },
    failureReason: {
      type: String,
      default: null
    },
    extractedText: {
      type: String,
      default: ''
    },
    pageCount: {
      type: Number,
      default: null
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

documentSchema.index({ ownerId: 1, projectId: 1, category: 1 });

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
export default Document;
