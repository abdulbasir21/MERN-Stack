import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'inquiry_received'
  | 'inquiry_updated'
  | 'quotation_received'
  | 'quotation_updated'
  | 'quotation_accepted'
  | 'quotation_rejected'
  | 'message_received'
  | 'review_received';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  entity?: {
    type: 'inquiry' | 'quotation' | 'message' | 'company';
    id: string;
  };
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'inquiry_received',
        'inquiry_updated',
        'quotation_received',
        'quotation_updated',
        'quotation_accepted',
        'quotation_rejected',
        'message_received',
        'review_received',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: {
        type: String,
        enum: ['inquiry', 'quotation', 'message', 'company'],
      },
      id: { type: String },
    },
    readAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's unread notifications quickly
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
