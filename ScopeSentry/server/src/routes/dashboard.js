import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardHandler } from '../controllers/dashboardController.js';

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  getDashboardHandler
);

export default router;
