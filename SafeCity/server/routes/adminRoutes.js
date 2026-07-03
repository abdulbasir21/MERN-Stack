const express = require('express');
const router = express.Router();
const {
  getAllComplaints,
  assignComplaint,
  getAnalytics,
  createOfficer,
  getOfficers,
  toggleOfficerStatus,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/assign', assignComplaint);
router.get('/analytics', getAnalytics);
router.post('/officers', createOfficer);
router.get('/officers', getOfficers);
router.patch('/officers/:id/deactivate', toggleOfficerStatus);

module.exports = router;
