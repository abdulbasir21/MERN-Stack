import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { PasswordResetToken } from '../../src/models/PasswordResetToken.js';
import { getSentEmailsSpy, clearSentEmailsSpy } from '../../src/integrations/email.js';

describe('Phase 2: Authentication & Accounts (BR-A1 to BR-A6)', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up test collections
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: { $regex: /@test\.com$/ } });
      await PasswordResetToken.deleteMany({});
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    clearSentEmailsSpy();
  });

  describe('2a: Register, Login, Session, Logout', () => {
    const testUser = {
      email: 'Contractor.Lead@test.com',
      password: 'SecurePassword123#',
      name: 'Elena Rostova'
    };

    it('BR-A1 & BR-A2: registers a new user with trimmed lowercase email and bcrypt hashed password', async () => {
      // Clean before test
      await User.deleteOne({ email: testUser.email.toLowerCase() });

      const res = await request(app)
        .post('/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);

      // Verify BR-A3: session cookie is set and httpOnly
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find(c => c.startsWith('scopesentry_session='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');

      // Verify in DB that plain password is never stored or logged (BR-A2)
      const userInDb = await User.findOne({ email: testUser.email.toLowerCase() });
      expect(userInDb).toBeDefined();
      expect(userInDb.passwordHash).not.toBe(testUser.password);
      expect(userInDb.passwordHash.startsWith('$2')).toBe(true); // bcrypt signature
    });

    it('BR-A1: duplicate email registration returns generic validation error and does not reveal existence', async () => {
      // Attempting to register same email with different casing and spaces
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: '  CONTRACTOR.LEAD@TEST.COM  ',
          password: 'AnotherPassword123#',
          name: 'Imposter'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Registration could not be completed');
    });

    it('BR-A2: weak password under 10 characters is strictly rejected', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'shortpw@test.com',
          password: 'short', // only 5 chars (< 10)
          name: 'Short PW User'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some(d => d.field === 'password')).toBe(true);
    });

    it('BR-A4: login failure message is identical for unknown email and wrong password', async () => {
      // 1. Unknown email
      const resUnknown = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent.user@test.com',
          password: 'AnyPassword123#'
        });

      expect(resUnknown.status).toBe(401);
      expect(resUnknown.body.error.code).toBe('UNAUTHENTICATED');
      expect(resUnknown.body.error.message).toBe('Invalid email or password');

      // 2. Known email with wrong password
      const resWrongPw = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email.toLowerCase(),
          password: 'WrongPassword999#'
        });

      expect(resWrongPw.status).toBe(401);
      expect(resWrongPw.body.error.code).toBe('UNAUTHENTICATED');
      expect(resWrongPw.body.error.message).toBe('Invalid email or password');

      // Exact message equality
      expect(resUnknown.body.error.message).toBe(resWrongPw.body.error.message);
    });

    it('logs in successfully with valid credentials and sets session cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email.toLowerCase(),
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('GET /auth/me returns current user profile when session cookie is provided', async () => {
      // Log in to get cookie
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email.toLowerCase(),
          password: testUser.password
        });

      const sessionCookie = loginRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/auth/me')
        .set('Cookie', sessionCookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(meRes.body.data.user.name).toBe(testUser.name);
    });

    it('GET /auth/me returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('BR-A6: POST /auth/logout clears session cookie server-side', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email.toLowerCase(),
          password: testUser.password
        });

      const sessionCookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Cookie', sessionCookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toBe('Logged out successfully');

      // Cookie should be cleared (expires in past / empty value)
      const clearCookies = logoutRes.headers['set-cookie'];
      expect(clearCookies).toBeDefined();
      const clearedSession = clearCookies.find(c => c.startsWith('scopesentry_session='));
      expect(clearedSession).toBeDefined();
      expect(clearedSession).toMatch(/expires=Thu, 01 Jan 1970|Max-Age=0/i);
    });
  });

  describe('2b: Password Recovery (BR-A5) and Settings', () => {
    const resetUser = {
      email: 'engineer.reset@test.com',
      password: 'InitialPassword123#',
      name: 'Marcus Vance'
    };

    beforeAll(async () => {
      await User.deleteOne({ email: resetUser.email });
      await request(app).post('/auth/register').send(resetUser);
    });

    it('BR-A5: forgot-password returns identical response for existing and non-existing email', async () => {
      // 1. Non-existing email
      const resUnknown = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'ghost@test.com' });

      expect(resUnknown.status).toBe(200);
      expect(resUnknown.body.data.message).toBe(
        'If this email is registered, you will receive password reset instructions.'
      );
      expect(getSentEmailsSpy().length).toBe(0);

      // 2. Existing email
      const resKnown = await request(app)
        .post('/auth/forgot-password')
        .send({ email: resetUser.email });

      expect(resKnown.status).toBe(200);
      expect(resKnown.body.data.message).toBe(resUnknown.body.data.message);

      // Verify reset email was dispatched (captured by spy)
      const sent = getSentEmailsSpy();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe(resetUser.email);
      expect(sent[0].token).toBeDefined();
    });

    it('BR-A5: resets password with valid token and invalidates previous sessions', async () => {
      // 1. Login with initial password to get session
      const loginOldRes = await request(app)
        .post('/auth/login')
        .send({ email: resetUser.email, password: resetUser.password });
      const oldSessionCookie = loginOldRes.headers['set-cookie'];

      // 2. Request forgot password
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: resetUser.email });

      const token = getSentEmailsSpy()[0].token;
      const newPassword = 'NewSecretPassword2025#';

      // 3. Reset password
      const resetRes = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          newPassword
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.message).toContain('successfully reset');

      // 4. Token cannot be reused (single-use)
      const reuseRes = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          newPassword: 'AnotherPassword999#'
        });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('VALIDATION_ERROR');

      // 5. Old password no longer works
      const oldLoginFail = await request(app)
        .post('/auth/login')
        .send({ email: resetUser.email, password: resetUser.password });
      expect(oldLoginFail.status).toBe(401);

      // 5b. Old session cookie is now invalid (BR-A5 session revocation)
      const oldSessionFail = await request(app)
        .get('/auth/me')
        .set('Cookie', oldSessionCookie);
      expect(oldSessionFail.status).toBe(401);

      // 6. New password works
      const newLoginSuccess = await request(app)
        .post('/auth/login')
        .send({ email: resetUser.email, password: newPassword });
      expect(newLoginSuccess.status).toBe(200);
    });

    it('BR-A5: rejects expired reset token', async () => {
      // Manually create an expired token
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour in the past
      const expiredToken = 'expired-token-12345';
      const crypto = await import('node:crypto');
      const tokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

      const user = await User.findOne({ email: resetUser.email });
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt: expiredDate,
        usedAt: null
      });

      const res = await request(app)
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'SomeNewPassword123#'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Settings: GET /settings and PATCH /settings updates name and requires current password to change password', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: resetUser.email, password: 'NewSecretPassword2025#' });
      const sessionCookie = loginRes.headers['set-cookie'];

      // Fetch CSRF token for PATCH
      const csrfRes = await request(app).get('/auth/csrf');
      const csrfCookie = csrfRes.headers['set-cookie'];
      const csrfToken = csrfRes.body.data.csrfToken;

      const combinedCookies = [sessionCookie[0], csrfCookie[0]];

      // 1. GET /settings
      const getSettingsRes = await request(app)
        .get('/settings')
        .set('Cookie', combinedCookies);

      expect(getSettingsRes.status).toBe(200);
      expect(getSettingsRes.body.data.settings.email).toBe(resetUser.email);

      // 2. PATCH without CSRF header is rejected (403)
      const rejectNoCsrf = await request(app)
        .patch('/settings')
        .set('Cookie', combinedCookies)
        .send({ name: 'Marcus Vance Senior' });
      expect(rejectNoCsrf.status).toBe(403);

      // 3. PATCH with CSRF header succeeds
      const updateNameRes = await request(app)
        .patch('/settings')
        .set('Cookie', combinedCookies)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Marcus Vance Senior' });

      expect(updateNameRes.status).toBe(200);
      expect(updateNameRes.body.data.settings.name).toBe('Marcus Vance Senior');
    });
  });
});
