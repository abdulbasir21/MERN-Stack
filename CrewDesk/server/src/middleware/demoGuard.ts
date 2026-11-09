import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../lib/audit.js';
import { consumeRateLimit, getClientIp } from './rateLimit.js';

export type DemoPolicy = 'BLOCK' | 'SANDBOX_WRITE';

export interface DemoGuardOptions {
  actionName?: string;
  message?: string;
  dailyCap?: number;
}

const SHORT_TEXT_FIELDS = new Set(['name', 'title', 'company', 'phone', 'role', 'location', 'invoiceNumber', 'reference']);
const LONG_TEXT_FIELDS = new Set(['description', 'notes', 'content', 'reason', 'decisionReason', 'condition']);

/**
 * Sanitizes string inputs in demo sandbox requests:
 * - Removes <script> blocks and HTML tags
 * - Strips ASCII control characters (except newline/tab)
 * - Trims and enforces strict length limits (120 chars for titles/names, 500 chars for notes/descriptions)
 */
export function sanitizeDemoString(value: string, maxLength: number): string {
  const cleaned = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

export function sanitizeDemoBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const result: Record<string, unknown> = { ...(body as Record<string, unknown>) };

  // Never allow client payload to inject or override isDemo
  delete result.isDemo;

  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'string') {
      if (SHORT_TEXT_FIELDS.has(key)) {
        result[key] = sanitizeDemoString(val, 120);
      } else if (LONG_TEXT_FIELDS.has(key)) {
        result[key] = sanitizeDemoString(val, 500);
      } else {
        result[key] = sanitizeDemoString(val, 500);
      }
    }
  }

  return result;
}

/**
 * Central Demo Account Security Guard Middleware.
 * - Always relies on req.user.isDemo loaded from the database in authenticate().
 * - For non-demo (registered) users: strips any isDemo body field and passes through.
 * - For demo users:
 *   - 'BLOCK': logs attempt (rate-limited) to AuditLog and returns 403 DEMO_RESTRICTED.
 *   - 'SANDBOX_WRITE': sanitizes inputs, enforces length limits, and enforces burst + daily creation caps.
 */
export function demoGuard(policy: DemoPolicy, options: DemoGuardOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Strip any client-supplied isDemo override on every write request
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      delete (req.body as Record<string, unknown>).isDemo;
    }

    if (!req.user || !req.user.isDemo) {
      return next();
    }

    const ip = getClientIp(req);
    const actionName = options.actionName || `${req.method} ${req.baseUrl}${req.path}`;

    if (policy === 'BLOCK') {
      // Rate-limit blocked-attempt audit logs so an attacker cannot flood the AuditLog table
      const auditLimitKey = `demo-audit-block:${req.user.userId}:${actionName}`;
      const { allowed: shouldLog } = await consumeRateLimit(auditLimitKey, 10, 15 * 60 * 1000);

      if (shouldLog) {
        await logAudit(req.user.userId, 'demo:restricted', 'DemoSecurity', req.user.userId, null, {
          blockedAction: actionName,
          method: req.method,
          path: req.originalUrl,
          ip,
        });
      }

      return res.status(403).json({
        error: {
          code: 'DEMO_RESTRICTED',
          message:
            options.message ||
            'This action is disabled in the live demo to keep the shared workspace clean.',
        },
      });
    }

    // policy === 'SANDBOX_WRITE'
    req.body = sanitizeDemoBody(req.body);

    // 1. Burst rate limit per user + IP (40 writes per 15 mins)
    const burstKey = `demo-burst:${req.user.userId}:${ip}`;
    const { allowed: burstAllowed } = await consumeRateLimit(burstKey, 40, 15 * 60 * 1000);
    if (!burstAllowed) {
      return res.status(429).json({
        error: {
          code: 'DEMO_RATE_LIMITED',
          message: 'Too many demo sandbox actions in a short window. Please wait a few minutes.',
        },
      });
    }

    // 2. Daily creation cap for POST requests (default 25 records per demo user per UTC day)
    if (req.method === 'POST') {
      const todayUtc = new Date().toISOString().split('T')[0];
      const dailyCap = options.dailyCap ?? 25;
      const dailyKey = `demo-daily:${req.user.userId}:${todayUtc}`;
      const { allowed: dailyAllowed } = await consumeRateLimit(dailyKey, dailyCap, 24 * 60 * 60 * 1000);

      if (!dailyAllowed) {
        return res.status(429).json({
          error: {
            code: 'DEMO_DAILY_CAP_REACHED',
            message: `Daily demo creation limit (${dailyCap} records/day) reached for this demo role. Demo data resets automatically every 24 hours.`,
          },
        });
      }
    }

    return next();
  };
}
