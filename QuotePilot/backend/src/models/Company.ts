import mongoose, { Schema, Document, Model } from 'mongoose';
import { COMPANY_STATUSES, CompanyStatus, SERVICE_CATEGORIES, ServiceCategory } from '../config/constants';

export interface IPortfolioItem {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  image: {
    url: string;
    fileId: string;
  };
}

export interface ICompany extends Document {
  ownerUserId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logo?: {
    url: string;
    fileId: string;
  };
  city: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  mainCategory: ServiceCategory;
  status: CompanyStatus;
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
  portfolio: IPortfolioItem[];
  ratingAverage: number;
  ratingCount: number;
  minStartingPrice?: number;
  searchText?: string;
  isSeedData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioItemSchema = new Schema<IPortfolioItem>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  image: {
    url: { type: String, required: true },
    fileId: { type: String, required: true },
  },
});

const companySchema = new Schema<ICompany>(
  {
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One company per owner admin
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    logo: {
      url: { type: String },
      fileId: { type: String },
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    mainCategory: {
      type: String,
      enum: SERVICE_CATEGORIES,
      required: true,
    },
    status: {
      type: String,
      enum: COMPANY_STATUSES,
      default: 'pending',
      required: true,
    },
    rejectionReason: {
      type: String,
      minlength: 10,
      maxlength: 500,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    portfolio: {
      type: [portfolioItemSchema],
      default: [],
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStartingPrice: {
      type: Number,
      min: 0,
    },
    searchText: {
      type: String,
      lowercase: true,
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

// Indexes per DATA_MODEL §2
companySchema.index({ status: 1, submittedAt: -1 });
companySchema.index({ status: 1, mainCategory: 1, ratingAverage: -1 });
companySchema.index({ name: 'text', searchText: 'text' });

export const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>('Company', companySchema);
