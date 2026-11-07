import mongoose, { Schema, Document, Model } from 'mongoose';
import { INQUIRY_STATUSES, InquiryStatus, LIMITS } from '../config/constants';

export interface IAiValidation {
  rounds: number;
  lastResult?: {
    isComplete: boolean;
    missing: string[];
    message: string;
  };
  overridden: boolean;
  skipped: boolean;
}

export interface IAiSummary {
  status: 'pending' | 'ready' | 'failed';
  summary?: string;
  requirements?: string[];
  extractedDetails?: {
    budget?: string;
    deadline?: string;
    other?: Array<{ label: string; value: string }>;
  };
  missingInfo?: string[];
  suggestedNextSteps?: string[];
  model?: string;
  generatedAt?: Date;
}

export interface IInquiry extends Document {
  referenceNumber: string;
  customerId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  serviceTitleSnapshot: string;
  description: string;
  budget?: number;
  deadline?: Date;
  status: InquiryStatus;
  aiValidation: IAiValidation;
  aiSummary: IAiSummary;
  quotationId?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  companyFirstViewedAt?: Date;
  clientRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiValidationSchema = new Schema<IAiValidation>(
  {
    rounds: { type: Number, default: 1 },
    lastResult: {
      isComplete: { type: Boolean },
      missing: [{ type: String }],
      message: { type: String },
    },
    overridden: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
  },
  { _id: false }
);

const aiSummarySchema = new Schema<IAiSummary>(
  {
    status: {
      type: String,
      enum: ['pending', 'ready', 'failed'],
      default: 'pending',
    },
    summary: { type: String },
    requirements: [{ type: String }],
    extractedDetails: {
      budget: { type: String },
      deadline: { type: String },
      other: [
        {
          label: { type: String },
          value: { type: String },
          _id: false,
        },
      ],
    },
    missingInfo: [{ type: String }],
    suggestedNextSteps: [{ type: String }],
    model: { type: String },
    generatedAt: { type: Date },
  },
  { _id: false }
);

const inquirySchema = new Schema<IInquiry>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceTitleSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [LIMITS.MIN_INQUIRY_DESCRIPTION, `Description must be at least ${LIMITS.MIN_INQUIRY_DESCRIPTION} characters`],
      maxlength: [LIMITS.MAX_INQUIRY_DESCRIPTION, `Description cannot exceed ${LIMITS.MAX_INQUIRY_DESCRIPTION} characters`],
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'submitted',
      required: true,
    },
    aiValidation: {
      type: aiValidationSchema,
      default: () => ({
        rounds: 1,
        overridden: false,
        skipped: false,
      }),
    },
    aiSummary: {
      type: aiSummarySchema,
      default: () => ({
        status: 'pending',
      }),
    },
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      maxlength: 120,
    },
    companyFirstViewedAt: {
      type: Date,
    },
    clientRequestId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

// Compound indexes per DATA_MODEL §4
inquirySchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });
inquirySchema.index({ customerId: 1, status: 1, lastMessageAt: -1 });
inquirySchema.index(
  { customerId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string' } } }
);

export const Inquiry: Model<IInquiry> =
  mongoose.models.Inquiry || mongoose.model<IInquiry>('Inquiry', inquirySchema);
