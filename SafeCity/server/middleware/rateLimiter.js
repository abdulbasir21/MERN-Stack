const rateLimit = require('express-rate-limit');

// Auth limiter — 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again in 15 minutes.',
  },
  skip: (req) => {
    // Skip rate limiting for demo-login in development
    return process.env.NODE_ENV === 'development' && req.path === '/demo-login';
  },
});

// General API limiter — 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
});

module.exports = { authLimiter, apiLimiter };