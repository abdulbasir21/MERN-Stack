import mongoose from 'mongoose';
import {
  CHANGE_CATEGORIES,
  REVIEW_STATUSES,
  CONFIDENCE_LEVELS
} from '../config/constants.js';

const findingSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      index: true
    },
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: CHANGE_CATEGORIES
    },
    originalValue: {
      type: String,
      default: ''
    },
    revisedValue: {
      type: String,
      default: ''
    },
    unit: {
      type: String,
      default: ''
    },
    extractedUnitPrice: {
      type: Number,
      default: null
    },
    unitPriceOverride: {
      type: Number,
      default: null
    },
    description: {
      type: String,
      default: ''
    },
    evidence: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentChunk' },
        snippet: { type: String, required: true },
        page: { type: Number, default: null },
        section: { type: String, default: null }
      }
    ],
    approvalEvidence: {
      status: { type: String, enum: ['found', 'not_found'], default: 'not_found' },
      evidence: [
        {
          documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
          chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentChunk' },
          snippet: { type: String, required: true },
          page: { type: Number, default: null },
          section: { type: String, default: null }
        }
      ]
    },
    scheduleInfo: {
      originalDate: { type: String, default: null },
      revisedDate: { type: String, default: null },
      milestone: { type: String, default: null }
    },
    confidence: {
      type: String,
      required: true,
      enum: CONFIDENCE_LEVELS,
      default: 'medium'
    },
    uncertaintyNote: {
      type: String,
      default: ''
    },
    reviewStatus: {
      type: String,
      required: true,
      enum: REVIEW_STATUSES,
      default: 'pending',
      index: true
    },
    flags: [
      {
        type: String
      }
    ]
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

findingSchema.index({ ownerId: 1, projectId: 1, reviewStatus: 1 });

export const Finding = mongoose.models.Finding || mongoose.model('Finding', findingSchema);
export default Finding;
