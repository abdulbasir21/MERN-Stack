import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically cleans up expired tokens
    },
    usedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

export const PasswordResetToken =
  mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', passwordResetTokenSchema);
