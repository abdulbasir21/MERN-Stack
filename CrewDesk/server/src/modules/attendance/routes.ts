import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { attendanceController } from './controller.js';

const router = Router();

// Own attendance check-in/out and status
router.post('/check-in', authenticate, requirePermission('attendance:check'), attendanceController.checkIn);
router.post('/check-out', authenticate, requirePermission('attendance:check'), attendanceController.checkOut);
router.get('/today', authenticate, requirePermission('attendance:check'), attendanceController.getTodayStatus);
router.get('/my', authenticate, requirePermission('attendance:check'), attendanceController.getMyAttendance);

// HR/Owner management
router.get('/', authenticate, requirePermission('attendance:read-all'), attendanceController.getAllAttendance);
router.put('/:id', authenticate, requirePermission('attendance:edit'), attendanceController.editAttendance);

export default router;
