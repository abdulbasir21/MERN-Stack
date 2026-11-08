import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { dashboardController } from './controller.js';

const router = Router();

// Scoped dashboard data for the authenticated role
router.get('/stats', authenticate, dashboardController.getStats);

export default router;
