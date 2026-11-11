import mongoose from 'mongoose';
import { INVESTIGATION_STATUSES } from '../config/constants.js';

const investigationSchema = new mongoose.Schema(
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
    originalDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    revisedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    supportingDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      }
    ],
    inputHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: INVESTIGATION_STATUSES,
      default: 'queued',
      index: true
    },
    stage: {
      type: String,
      default: 'queued'
    },
    failureReason: {
      type: String,
      default: null
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    finishedAt: {
      type: Date,
      default: null
    },
    demoSessionId: {
      type: String,
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

// BR-I3: Unique partial index so only one active investigation can exist for the same inputHash
investigationSchema.index(
  { inputHash: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['queued', 'running'] } }
  }
);

export const Investigation = mongoose.models.Investigation || mongoose.model('Investigation', investigationSchema);
export default Investigation;
