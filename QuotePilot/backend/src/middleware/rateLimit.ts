import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new AppError(429, 'RATE_LIMITED', 'Too many login or registration attempts. Please try again in a minute.'));
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.'));
  },
});
