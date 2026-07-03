const User = require('../models/User');
const Complaint = require('../models/Complaint');
const sendEmail = require('../utils/sendEmail');

// ─── GET /api/admin/complaints — all complaints with filters ──────────────────
exports.getAllComplaints = async (req, res, next) => {
  try {
    const { category, status, area, priority } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (area) filter.area = { $regex: area, $options: 'i' };
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/complaints/:id/assign ───────────────────────────────────
exports.assignComplaint = async (req, res, next) => {
  try {
    const { officerId } = req.body;

    if (!officerId) {
      return res.status(400).json({ success: false, message: 'officerId is required.' });
    }

    const officer = await User.findById(officerId);
    if (!officer || officer.role !== 'officer') {
      return res.status(404).json({ success: false, message: 'Officer not found.' });
    }
    if (!officer.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign to a deactivated officer.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    complaint.assignedOfficer = officerId;
    complaint.status = 'assigned';
    await complaint.save();

    // Notify officer
    await sendEmail({
      to: officer.email,
      subject: `New Complaint Assigned: #${complaint._id}`,
      html: `<p>Hi ${officer.name},</p><p>A complaint titled "<strong>${complaint.title}</strong>" in area <strong>${complaint.area}</strong> has been assigned to you. Please log in to review and investigate.</p>`,
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email');

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
exports.getAnalytics = async (req, res, next) => {
  try {
    const total = await Complaint.countDocuments();

    // Group by category
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Group by status
    const byStatus = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average resolution time (in days) for resolved complaints
    const resolvedComplaints = await Complaint.find({
      status: { $in: ['resolved', 'closed'] },
    }).select('createdAt updatedAt');

    let avgResolutionDays = 0;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((acc, c) => {
        return acc + (new Date(c.updatedAt) - new Date(c.createdAt));
      }, 0);
      avgResolutionDays = parseFloat(
        (totalMs / resolvedComplaints.length / (1000 * 60 * 60 * 24)).toFixed(2)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        total,
        byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        avgResolutionDays,
        resolvedCount: resolvedComplaints.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/officers — create officer ────────────────────────────────
exports.createOfficer = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, and password are required.' });
    }

    const officer = await User.create({ name, email, password, role: 'officer' });

    await sendEmail({
      to: email,
      subject: 'SafeCity Officer Account Created',
      html: `<p>Hi ${name},</p><p>Your officer account on SafeCity has been created. You can log in with your email and the password provided by the admin.</p>`,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: officer._id,
        name: officer.name,
        email: officer.email,
        role: officer.role,
        isActive: officer.isActive,
        createdAt: officer.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/officers — list officers with complaint counts (single aggregate, no N+1) ──
exports.getOfficers = async (req, res, next) => {
  try {
    const officersWithStats = await User.aggregate([
      { $match: { role: 'officer' } },
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: 'assignedOfficer',
          as: 'complaints',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          isActive: 1,
          createdAt: 1,
          stats: {
            assigned: { $size: '$complaints' },
            resolved: {
              $size: {
                $filter: {
                  input: '$complaints',
                  as: 'c',
                  cond: { $in: ['$$c.status', ['resolved', 'closed']] },
                },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({ success: true, count: officersWithStats.length, data: officersWithStats });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/officers/:id/deactivate — toggle isActive ───────────────
exports.toggleOfficerStatus = async (req, res, next) => {
  try {
    const officer = await User.findById(req.params.id);

    if (!officer || officer.role !== 'officer') {
      return res.status(404).json({ success: false, message: 'Officer not found.' });
    }

    officer.isActive = !officer.isActive;
    await officer.save();

    res.status(200).json({
      success: true,
      message: `Officer ${officer.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { _id: officer._id, name: officer.name, isActive: officer.isActive },
    });
  } catch (err) {
    next(err);
  }
};
