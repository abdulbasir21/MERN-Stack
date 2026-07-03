const mongoose = require('mongoose');

// Keywords that trigger urgent priority
const URGENT_KEYWORDS = ['missing', 'armed', 'child', 'weapon', 'kidnap', 'hostage', 'bomb'];

const complaintSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['theft', 'harassment', 'missing_person', 'fraud', 'other'],
      required: [true, 'Category is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      maxlength: [100, 'Area cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'assigned', 'investigating', 'resolved', 'closed'],
      default: 'submitted',
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    notes: [
      {
        officer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: {
          type: String,
          required: true,
          maxlength: [1000, 'Note cannot exceed 1000 characters'],
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
      },
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// ─── Auto-set priority based on description keywords ─────────────────────────
complaintSchema.pre('save', function (next) {
  if (this.isModified('description') || this.isNew) {
    const lowerDesc = (this.description + ' ' + this.title).toLowerCase();
    const isUrgent = URGENT_KEYWORDS.some((kw) => lowerDesc.includes(kw));
    if (isUrgent) {
      this.priority = 'urgent';
    }
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
