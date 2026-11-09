import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Extracts the real client IP behind Vercel's edge proxy layers.
 * Layer 1: Client Vercel Rewrite (/api/* -> server)
 * Layer 2: Server Vercel Edge
 */
export function getClientIp(req: Request): string {
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim().length > 0) {
    return vercelForwarded.split(',')[0].trim();
  }
  const xForwarded = req.headers['x-forwarded-for'];
  if (typeof xForwarded === 'string' && xForwarded.trim().length > 0) {
    return xForwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Shared PostgreSQL-backed rate limit bucket for serverless environments.
 * Returns { allowed: boolean, current: number, resetAt: Date }
 */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; current: number; resetAt: Date }> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  try {
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

    if (!existing || existing.resetAt <= now) {
      const resetBucket = await prisma.rateLimitBucket.upsert({
        where: { key },
        update: { count: 1, resetAt: nextReset },
        create: { key, count: 1, resetAt: nextReset },
      });
      return { allowed: true, current: resetBucket.count, resetAt: resetBucket.resetAt };
    }

    if (existing.count >= max) {
      return { allowed: false, current: existing.count, resetAt: existing.resetAt };
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, current: updated.count, resetAt: updated.resetAt };
  } catch {
    // Fail open only if DB is transiently unreachable so legitimate auth isn't bricked
    return { allowed: true, current: 1, resetAt: nextReset };
  }
}

/**
 * Shared DB-backed login rate limiter (15 attempts per 15 minutes per IP in production;
 * higher threshold in automated test environment).
 */
export async function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const isTest = process.env.NODE_ENV === 'test';
  const maxAttempts = isTest ? 200 : 15;
  const windowMs = 15 * 60 * 1000;

  const { allowed } = await consumeRateLimit(`login:${ip}`, maxAttempts, windowMs);
  if (!allowed) {
    return res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again after 15 minutes.',
      },
    });
  }

  return next();
}
