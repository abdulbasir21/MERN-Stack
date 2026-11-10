import type { Request, Response, NextFunction } from 'express';
import {
  GLOBAL_RATE_LIMIT_MAX,
  GLOBAL_RATE_LIMIT_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
  LOGIN_WINDOW_MS,
  AI_RATE_LIMIT_MAX,
  AI_RATE_LIMIT_WINDOW_MS,
} from '../config/constants.js';
import { AppError } from '../lib/errors.js';

interface CounterWindow {
  count: number;
  resetAt: number;
}

const ipCounterStore = new Map<string, CounterWindow>();
const loginFailureStore = new Map<string, CounterWindow>();
const aiUserCounterStore = new Map<string, CounterWindow>();

export function resetAllRateLimits(): void {
  ipCounterStore.clear();
  loginFailureStore.clear();
  aiUserCounterStore.clear();
}

function getClientIp(req: Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function incrementWindow(
  store: Map<string, CounterWindow>,
  key: string,
  windowMs: number
): number {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

/**
 * QTA-13: 100 requests / minute / IP overall
 */
export function globalRateLimiter(req: Request, _res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const current = incrementWindow(ipCounterStore, ip, GLOBAL_RATE_LIMIT_WINDOW_MS);
  if (current > GLOBAL_RATE_LIMIT_MAX) {
    next(
      new AppError(
        'RATE_LIMITED',
        'Too many requests from this IP. Please wait a minute and try again.',
        429
      )
    );
    return;
  }
  next();
}

/**
 * QTA-13: 20 requests / minute / user on AI endpoints
 */
export function aiEndpointRateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const userKey = req.actor?.id || getClientIp(req);
  const current = incrementWindow(aiUserCounterStore, userKey, AI_RATE_LIMIT_WINDOW_MS);
  if (current > AI_RATE_LIMIT_MAX) {
    next(
      new AppError(
        'RATE_LIMITED',
        'Too many AI requests. Please wait a moment and try again.',
        429
      )
    );
    return;
  }
  next();
}

export function getLoginAttemptKey(email: string, req: Request): string {
  const ip = getClientIp(req);
  return `${email.trim().toLowerCase()}|${ip}`;
}

/**
 * AUTH-3 & QTA-13: More than 5 failed attempts per email+IP in 15 minutes -> 429
 */
export function checkLoginRateLimit(email: string, req: Request): void {
  const key = getLoginAttemptKey(email, req);
  const now = Date.now();
  const entry = loginFailureStore.get(key);
  if (entry && now < entry.resetAt && entry.count >= LOGIN_MAX_FAILED_ATTEMPTS) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many failed login attempts. Please try again in 15 minutes.',
      429
    );
  }
}

export function recordFailedLoginAttempt(email: string, req: Request): void {
  const key = getLoginAttemptKey(email, req);
  incrementWindow(loginFailureStore, key, LOGIN_WINDOW_MS);
}

export function clearFailedLoginAttempts(email: string, req: Request): void {
  const key = getLoginAttemptKey(email, req);
  loginFailureStore.delete(key);
}
