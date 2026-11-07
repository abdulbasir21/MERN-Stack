import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  companyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  inquiryId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  reviewerDisplayName: string;
  isSeedData?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: [true, 'Inquiry reference is required'],
      unique: true, // Exactly one review per accepted inquiry (BR-14)
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    reviewerDisplayName: {
      type: String,
      required: true,
      trim: true,
    },
    isSeedData: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ companyId: 1, createdAt: -1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
