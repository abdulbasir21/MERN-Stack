import mongoose, { Schema, Document, Model } from 'mongoose';
import { SERVICE_CATEGORIES, ServiceCategory, LIMITS } from '../config/constants';

export interface IChecklistItem {
  item: string;
  helpText?: string;
  required: boolean;
  order: number;
}

export interface IService extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  category: ServiceCategory;
  description?: string;
  startingPrice?: number;
  pricingUnit?: 'fixed' | 'hourly' | 'starting_at';
  deliveryTimeEstimate?: string;
  requirementsChecklist: IChecklistItem[];
  isActive: boolean;
  isSeedData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    item: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Checklist item must be at least 3 characters'],
      maxlength: [200, 'Checklist item cannot exceed 200 characters']
    },
    helpText: {
      type: String,
      trim: true,
      maxlength: [300, 'Help text cannot exceed 300 characters']
    },
    required: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const serviceSchema = new Schema<IService>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      minlength: [3, 'Service title must be at least 3 characters'],
      maxlength: [120, 'Service title cannot exceed 120 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: SERVICE_CATEGORIES,
        message: 'Invalid service category'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    startingPrice: {
      type: Number,
      min: [0, 'Starting price cannot be negative']
    },
    pricingUnit: {
      type: String,
      enum: ['fixed', 'hourly', 'starting_at'],
      default: 'starting_at'
    },
    deliveryTimeEstimate: {
      type: String,
      trim: true,
      maxlength: [100, 'Delivery estimate cannot exceed 100 characters']
    },
    requirementsChecklist: {
      type: [checklistItemSchema],
      default: [],
      validate: {
        validator: function (val: IChecklistItem[]) {
          return !val || val.length <= LIMITS.MAX_CHECKLIST_ITEMS;
        },
        message: `Requirements checklist cannot exceed ${LIMITS.MAX_CHECKLIST_ITEMS} items`
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSeedData: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

// Compound unique index: companyId + title (case-insensitive collation or unique per company)
serviceSchema.index({ companyId: 1, title: 1 }, { unique: true });
serviceSchema.index({ companyId: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });

export const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>('Service', serviceSchema);
