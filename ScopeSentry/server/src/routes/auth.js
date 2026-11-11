import { Router } from 'express';
import { z } from 'zod';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPasswordHandler,
  getCsrfToken
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Zod Validation Schemas
const registerSchema = {
  body: z.object({
    email: z.string().trim().email('Valid work email is required'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password must not exceed 128 characters'),
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters')
  })
};

const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email is required'),
    password: z.string().min(1, 'Password is required')
  })
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email is required')
  })
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(10, 'New password must be at least 10 characters')
      .max(128, 'New password must not exceed 128 characters')
  })
};

// Routes
router.get('/csrf', getCsrfToken);
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPasswordHandler);

export default router;
