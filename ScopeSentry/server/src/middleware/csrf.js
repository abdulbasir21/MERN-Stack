import crypto from 'node:crypto';
import { AppError } from './errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';
import { config } from '../config/env.js';

export function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('scopesentry_csrf', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain
  });
  return token;
}

export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  // Safe HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.scopesentry_csrf;

  if (!clientToken || !cookieToken || clientToken !== cookieToken) {
    return next(new AppError(ERROR_CODES.FORBIDDEN, 'Invalid or missing CSRF token', 403));
  }

  next();
}
