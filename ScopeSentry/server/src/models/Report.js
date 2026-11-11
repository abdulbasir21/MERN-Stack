import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    storedFileId: {
      type: String,
      default: null
    },
    filename: {
      type: String,
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

reportSchema.index({ ownerId: 1, projectId: 1, generatedAt: -1 });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
