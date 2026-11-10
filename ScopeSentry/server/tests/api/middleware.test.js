import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../src/middleware/auth.js';
import { csrfProtection, issueCsrfToken } from '../../src/middleware/csrf.js';
import { validate } from '../../src/middleware/validate.js';
import { centralErrorHandler } from '../../src/middleware/errorHandler.js';
import { config } from '../../src/config/env.js';
import { PERMISSIONS } from '../../src/config/constants.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // CSRF Issue endpoint
  app.get('/api/test/csrf', (req, res) => {
    const token = issueCsrfToken(res);
    res.json({ data: { csrfToken: token } });
  });

  // State-changing route protected by CSRF
  app.post('/api/test/mutate', csrfProtection, (req, res) => {
    res.json({ data: { success: true } });
  });

  // Protected route requiring authentication
  app.get('/api/test/protected', authenticate, (req, res) => {
    res.json({ data: { user: req.user } });
  });

  // Protected route requiring specific permission
  app.get(
    '/api/test/permission-project-create',
    authenticate,
    requirePermission(PERMISSIONS.PROJECT_CREATE),
    (req, res) => {
      res.json({ data: { permitted: true } });
    }
  );

  // Validation route
  const testSchema = {
    body: z.object({
      name: z.string().min(3, 'Name must be at least 3 chars'),
      budget: z.number().positive('Budget must be positive')
    })
  };

  app.post('/api/test/validate', validate(testSchema), (req, res) => {
    res.json({ data: { valid: true, body: req.body } });
  });

  app.use(centralErrorHandler);
  return app;
}

describe('Phase 1: Middleware & Security Infrastructure', () => {
  const app = createTestApp();

  describe('authenticate middleware', () => {
    it('returns 401 UNAUTHENTICATED when no session cookie or token is provided', async () => {
      const res = await request(app).get('/api/test/protected');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.error.message).toBe('Authentication required');
    });

    it('returns 401 UNAUTHENTICATED when token is forged or expired', async () => {
      const res = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'Bearer forged-invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('authenticates successfully and attaches req.user with valid cookie', async () => {
      const validToken = jwt.sign(
        { userId: 'user_456', email: 'pm@scopesentry.ai', role: 'user' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/test/protected')
        .set('Cookie', [`scopesentry_session=${validToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe('user_456');
      expect(res.body.data.user.email).toBe('pm@scopesentry.ai');
    });
  });

  describe('requirePermission middleware', () => {
    it('allows access when user role possesses the requested permission', async () => {
      const userToken = jwt.sign(
        { userId: 'user_123', email: 'owner@site.com', role: 'user' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/test/permission-project-create')
        .set('Cookie', [`scopesentry_session=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.permitted).toBe(true);
    });

    it('returns 403 FORBIDDEN when visitor attempts user-only action', async () => {
      const visitorToken = jwt.sign(
        { userId: 'vis_1', email: 'visitor@site.com', role: 'visitor' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/test/permission-project-create')
        .set('Cookie', [`scopesentry_session=${visitorToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('csrfProtection middleware', () => {
    it('blocks mutating state request when CSRF token is missing (403)', async () => {
      const res = await request(app).post('/api/test/mutate').send({ key: 'value' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('CSRF');
    });

    it('blocks mutating state request when CSRF token does not match cookie (403)', async () => {
      const res = await request(app)
        .post('/api/test/mutate')
        .set('Cookie', ['scopesentry_csrf=correct_token_123'])
        .set('X-CSRF-Token', 'wrong_token_456')
        .send({ key: 'value' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows mutating state request when valid CSRF cookie and matching header are provided', async () => {
      const csrfRes = await request(app).get('/api/test/csrf');
      const token = csrfRes.body.data.csrfToken;
      const cookies = csrfRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/test/mutate')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', token)
        .send({ key: 'value' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
  });

  describe('validate(schema) middleware', () => {
    it('returns 400 VALIDATION_ERROR with field details on invalid request body', async () => {
      const res = await request(app)
        .post('/api/test/validate')
        .send({ name: 'ab', budget: -50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
      expect(res.body.error.details.some(d => d.field === 'name')).toBe(true);
      expect(res.body.error.details.some(d => d.field === 'budget')).toBe(true);
    });

    it('passes and parses valid request body', async () => {
      const res = await request(app)
        .post('/api/test/validate')
        .send({ name: 'Tower Construction', budget: 150000 });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.body.name).toBe('Tower Construction');
    });
  });

  describe('rate limiting middleware', () => {
    it('triggers 429 RATE_LIMITED after limit is exceeded on rate-limited route', async () => {
      const rateLimitedApp = express();
      const { authRateLimiter } = await import('../../src/middleware/rateLimit.js');
      rateLimitedApp.use(authRateLimiter);
      rateLimitedApp.get('/test-limit', (req, res) => res.json({ ok: true }));

      // Max is 10 for authRateLimiter. Hit it 10 times:
      for (let i = 0; i < 10; i++) {
        await request(rateLimitedApp).get('/test-limit');
      }

      // 11th request must return 429
      const res = await request(rateLimitedApp).get('/test-limit');
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(res.body.error.message).toContain('Too many authentication attempts');
    });
  });
});
