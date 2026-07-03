const Complaint = require('../models/Complaint');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// ─── POST /api/complaints — create complaint (citizen) ───────────────────────
exports.createComplaint = async (req, res, next) => {
  try {
    const { category, title, description, area, isAnonymous } = req.body;

    if (!category || !title || !description || !area) {
      return res.status(400).json({
        success: false,
        message: 'category, title, description, and area are all required.',
      });
    }

    const complaint = await Complaint.create({
      citizen: req.user._id,
      isAnonymous: Boolean(isAnonymous),
      category,
      title,
      description,
      area,
    });

    // Notify citizen (non-blocking)
    if (!complaint.isAnonymous) {
      await sendEmail({
        to: req.user.email,
        subject: `Complaint #${complaint._id} Received`,
        html: `<p>Hi ${req.user.name},</p><p>Your complaint "<strong>${title}</strong>" has been submitted and is under review. You can track its status in your dashboard.</p>`,
      });
    }

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/complaints/mine — citizen's own complaints ─────────────────────
exports.getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .populate('assignedOfficer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/complaints/assigned — officer's assigned complaints ─────────────
exports.getAssignedComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ assignedOfficer: req.user._id })
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/complaints/:id — view single complaint ─────────────────────────
exports.getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email')
      .populate('notes.officer', 'name');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const userId = req.user._id.toString();
    const isOwner = complaint.citizen && complaint.citizen._id.toString() === userId;
    const isAssignedOfficer =
      complaint.assignedOfficer && complaint.assignedOfficer._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedOfficer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this complaint.' });
    }

    // Hide citizen identity from officers if anonymous
    if (req.user.role === 'officer' && complaint.isAnonymous) {
      const sanitized = complaint.toObject();
      sanitized.citizen = null;
      return res.status(200).json({ success: true, data: sanitized });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/complaints/:id/status — officer updates status ────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['submitted', 'under_review', 'assigned', 'investigating', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Officer must be assigned to this complaint (or admin)
    const isAssigned =
      complaint.assignedOfficer && complaint.assignedOfficer.toString() === req.user._id.toString();
    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not assigned to this complaint.' });
    }

    complaint.status = status;

    if (note && note.trim()) {
      complaint.notes.push({
        officer: req.user._id,
        note: note.trim(),
        date: new Date(),
      });
    }

    await complaint.save();

    // Notify citizen on status change
    if (complaint.citizen) {
      const citizen = await User.findById(complaint.citizen);
      if (citizen && !complaint.isAnonymous) {
        await sendEmail({
          to: citizen.email,
          subject: `Complaint Update: Status changed to "${status}"`,
          html: `<p>Hi ${citizen.name},</p><p>Your complaint "<strong>${complaint.title}</strong>" status has been updated to <strong>${status}</strong>.</p>`,
        });
      }
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/complaints/:id/feedback — citizen submits feedback ─────────────
exports.submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (!complaint.citizen || complaint.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only leave feedback on your own complaints.' });
    }

    if (complaint.status !== 'resolved') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted on resolved complaints.' });
    }

    if (complaint.feedback && complaint.feedback.rating) {
      return res.status(400).json({ success: false, message: 'Feedback has already been submitted for this complaint.' });
    }

    complaint.feedback = { rating: Number(rating), comment: comment || '' };
    await complaint.save();

    res.status(200).json({ success: true, data: complaint.feedback });
  } catch (err) {
    next(err);
  }
};
