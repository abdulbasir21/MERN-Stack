import mongoose, { Schema, Document, Model } from 'mongoose';

export type MilestoneStatus =
  | 'pending'
  | 'funded'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'disputed';

export type QuotationStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface IMilestone {
  _id?: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  deliverables: string[];
  estimatedDeliveryDays: number;
  order: number;
  status: MilestoneStatus;
}

export interface IQuotationVersionHistory {
  version: number;
  totalAmount: number;
  milestones: IMilestone[];
  changedAt: Date;
  reason?: string;
}

export interface IQuotation extends Document {
  inquiryId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  referenceNumber: string;
  version: number;
  totalAmount: number;
  currency: string;
  milestones: IMilestone[];
  termsAndConditions?: string;
  validUntil: Date;
  status: QuotationStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  versionHistory: IQuotationVersionHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      minlength: [3, 'Milestone title must be at least 3 characters'],
      maxlength: [100, 'Milestone title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Milestone amount is required'],
      min: [1, 'Milestone amount must be greater than zero'],
    },
    deliverables: {
      type: [String],
      default: [],
    },
    estimatedDeliveryDays: {
      type: Number,
      required: [true, 'Estimated delivery days is required'],
      min: [1, 'Delivery estimate must be at least 1 day'],
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'funded', 'in_progress', 'submitted', 'approved', 'disputed'],
      default: 'pending',
    },
  },
  { _id: true }
);

const versionHistorySchema = new Schema<IQuotationVersionHistory>(
  {
    version: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    milestones: [milestoneSchema],
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { _id: false }
);

const quotationSchema = new Schema<IQuotation>(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      unique: true, // BR-11: exactly one quotation per inquiry
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total quotation amount is required'],
      min: [0, 'Total quotation amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'PKR',
      uppercase: true,
    },
    milestones: {
      type: [milestoneSchema],
      validate: {
        validator: function (milestones: IMilestone[]) {
          return milestones && milestones.length >= 1;
        },
        message: 'A quotation must contain at least one milestone deliverable',
      },
    },
    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: [3000, 'Terms and conditions cannot exceed 3000 characters'],
    },
    validUntil: {
      type: Date,
      required: [true, 'Quotation validity expiry date is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'sent',
      index: true,
    },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    versionHistory: {
      type: [versionHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation: Ensure sum of milestone amounts equals totalAmount
quotationSchema.pre('validate', function (next) {
  if (this.milestones && this.milestones.length > 0) {
    const sum = this.milestones.reduce((acc, m) => acc + (m.amount || 0), 0);
    // Tolerance for floating point
    if (Math.abs(sum - this.totalAmount) > 0.01) {
      return next(
        new Error(
          `Total quotation amount (${this.totalAmount}) must exactly match the sum of milestone amounts (${sum})`
        )
      );
    }
  }
  next();
});

export const Quotation: Model<IQuotation> =
  mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', quotationSchema);
