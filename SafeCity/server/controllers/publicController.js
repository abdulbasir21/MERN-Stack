const Complaint = require('../models/Complaint');

// ─── GET /api/public/stats ────────────────────────────────────────────────────
exports.getPublicStats = async (req, res, next) => {
  try {
    const total = await Complaint.countDocuments();

    const resolvedCount = await Complaint.countDocuments({
      status: { $in: ['resolved', 'closed'] },
    });

    const resolutionRate = total > 0 ? parseFloat(((resolvedCount / total) * 100).toFixed(1)) : 0;

    // Category breakdown
    const categoryData = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average resolution time
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
        totalComplaints: total,
        resolutionRate,
        avgResolutionDays,
        categoryBreakdown: categoryData.reduce(
          (acc, item) => ({ ...acc, [item._id]: item.count }),
          {}
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/public/recent-resolved ─────────────────────────────────────────
// Returns last 10 resolved complaints — anonymized (no citizen info)
exports.getRecentResolved = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ status: { $in: ['resolved', 'closed'] } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('category area createdAt updatedAt status -_id');

    const anonymized = complaints.map((c) => ({
      category: c.category,
      area: c.area,
      status: c.status,
      resolutionDays: parseFloat(
        ((new Date(c.updatedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)).toFixed(1)
      ),
    }));

    res.status(200).json({ success: true, count: anonymized.length, data: anonymized });
  } catch (err) {
    next(err);
  }
};
