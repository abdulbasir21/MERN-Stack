import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    role: {
      type: String,
      enum: ['user', 'visitor'],
      default: 'user'
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
