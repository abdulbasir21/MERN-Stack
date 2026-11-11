import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../config/constants.js';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: message || 'Too many requests, please try again later'
        }
      });
    }
  });
}

// Auth endpoints (register, login, forgot-password): 10 requests per 15 min per IP
export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again later.'
});

// Upload endpoints: 30 requests per 15 min per IP
export const uploadRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Upload rate limit exceeded. Please try again later.'
});

// Investigation start: 10 requests per 15 min
export const investigationRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Investigation rate limit exceeded. Please try again later.'
});

// Public Demo runs: strict limit (default 20 runs per hour per IP)
export const demoRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Demo investigation limit exceeded. Please try again tomorrow.'
});

// General API limiter
export const standardRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'API rate limit exceeded.'
});
