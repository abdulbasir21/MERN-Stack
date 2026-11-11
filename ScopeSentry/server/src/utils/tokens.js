import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

export function generateSessionToken(user) {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role || 'user',
    tokenVersion: user.tokenVersion || 0
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(plainToken) {
  return crypto.createHash('sha256').update(plainToken).digest('hex');
}
