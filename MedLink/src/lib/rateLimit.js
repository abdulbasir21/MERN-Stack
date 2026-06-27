// lib/rateLimit.js — in-memory rate limiter (use Redis in production)
const store = new Map();

/**
 * @param {string} key   - identifier (IP or email)
 * @param {number} limit - max requests
 * @param {number} windowMs - window in milliseconds
 */
export function rateLimit(key, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = store.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { blocked: true, retryAfter: retryAfterSec };
  }

  return { blocked: false, remaining: limit - entry.count };
}
