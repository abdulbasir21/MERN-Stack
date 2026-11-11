import mongoose from 'mongoose';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../config/constants.js';

const projectSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    projectType: {
      type: String,
      required: true,
      enum: PROJECT_TYPES
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    budget: {
      type: Number,
      min: 0,
      default: null
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    startDate: {
      type: String,
      default: null
    },
    expectedCompletionDate: {
      type: String,
      default: null
    },
    status: {
      type: String,
      required: true,
      enum: PROJECT_STATUSES,
      default: 'active',
      index: true
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

// Compound index for user project lists ordered by recency
projectSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export default Project;
