import mongoose, { Schema, Document, Model } from 'mongoose';

export type SenderRole = 'customer' | 'company_admin';
export type MessageType = 'initial_request' | 'text';

export interface IMessage extends Document {
  inquiryId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: SenderRole;
  type: MessageType;
  text: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'company_admin'],
      required: true,
    },
    type: {
      type: String,
      enum: ['initial_request', 'text'],
      default: 'text',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    readAt: {
      type: Date,
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

messageSchema.index({ inquiryId: 1, createdAt: -1 });
messageSchema.index({ inquiryId: 1, readAt: 1, senderRole: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
