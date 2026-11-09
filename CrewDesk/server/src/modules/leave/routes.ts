import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { leaveController } from './controller.js';

const router = Router();

// Own balances and requests
router.get('/my-balances', authenticate, requirePermission('leave:read-own'), leaveController.getMyBalances);
router.get('/my-requests', authenticate, requirePermission('leave:read-own'), leaveController.getMyRequests);
router.post(
  '/request',
  authenticate,
  requirePermission('leave:request'),
  demoGuard('SANDBOX_WRITE', { actionName: 'leave:request' }),
  leaveController.createRequest
);
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('leave:request'),
  demoGuard('SANDBOX_WRITE', { actionName: 'leave:cancel' }),
  leaveController.cancelRequest
);

// Approver queue and decisions (HR / Owner)
router.get('/approval-queue', authenticate, requirePermission('leave:approve'), leaveController.getApprovalQueue);
router.post(
  '/:id/approve',
  authenticate,
  requirePermission('leave:approve'),
  demoGuard('SANDBOX_WRITE', { actionName: 'leave:approve' }),
  leaveController.approveRequest
);
router.post(
  '/:id/reject',
  authenticate,
  requirePermission('leave:approve'),
  demoGuard('SANDBOX_WRITE', { actionName: 'leave:reject' }),
  leaveController.rejectRequest
);
router.get('/all', authenticate, requirePermission('leave:approve'), leaveController.getAllRequests);

export default router;
