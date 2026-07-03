const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getAssignedComplaints,
  getComplaint,
  updateStatus,
  submitFeedback,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

// Order matters: specific routes before :id
router.get('/mine', protect, authorize('citizen'), getMyComplaints);
router.get('/assigned', protect, authorize('officer'), getAssignedComplaints);

router.post('/', protect, authorize('citizen'), createComplaint);
router.get('/:id', protect, getComplaint);
router.patch('/:id/status', protect, authorize('officer', 'admin'), updateStatus);
router.post('/:id/feedback', protect, authorize('citizen'), submitFeedback);

module.exports = router;
