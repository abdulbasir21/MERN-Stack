const express = require('express');
const router = express.Router();
const { register, login, demoLogin, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Apply strict rate limiter to login & register
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/demo-login', demoLogin); // No rate limit on demo-login (portfolio convenience)
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
