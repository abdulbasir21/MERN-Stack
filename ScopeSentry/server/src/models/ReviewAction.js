import mongoose from 'mongoose';
import { AUDIT_ACTION_TYPES } from '../config/constants.js';

const reviewActionSchema = new mongoose.Schema(
  {
    findingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finding',
      required: true,
      index: true
    },
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: AUDIT_ACTION_TYPES
    },
    fromStatus: {
      type: String,
      default: null
    },
    toStatus: {
      type: String,
      default: null
    },
    comment: {
      type: String,
      maxlength: 2000,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

reviewActionSchema.index({ findingId: 1, createdAt: 1 });

export const ReviewAction = mongoose.models.ReviewAction || mongoose.model('ReviewAction', reviewActionSchema);
export default ReviewAction;
