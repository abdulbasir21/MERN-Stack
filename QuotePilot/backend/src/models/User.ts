import mongoose, { Schema, Document, Model } from 'mongoose';
import { USER_ROLES, UserRole } from '../config/constants';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId?: mongoose.Types.ObjectId;
  phone?: string;
  status: 'active' | 'blocked';
  lastLoginAt?: Date;
  isSeedData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Exclude by default from query results
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: 'customer',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      sparse: true,
      unique: true, // Exactly one admin user per company (BR-03, DATA_MODEL §1)
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
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

// Indexes per DATA_MODEL §1 are established by field definitions (unique: true)
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
