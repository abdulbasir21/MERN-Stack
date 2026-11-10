import { describe, it, expect } from 'vitest';
import { validateEnv, formatEnvStatusReport } from '../../src/config/env.js';

const MOCK_SECRET_VALUE = 'SUPER_SECRET_NEVER_PRINT_ME_99999999999';

function createValidMockEnv(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    PORT: '4000',
    CLIENT_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://user:pass@ep-main.neon.tech/neondb',
    DATABASE_URL_UNPOOLED: 'postgresql://user:pass@ep-main.neon.tech/neondb',
    TEST_DATABASE_URL: 'postgresql://user:pass@ep-test.neon.tech/neondb_test',
    TEST_DATABASE_URL_UNPOOLED: 'postgresql://user:pass@ep-test.neon.tech/neondb_test',
    JWT_SECRET: MOCK_SECRET_VALUE,
    JWT_EXPIRES_IN: '7d',
    DEMO_IP_HASH_SECRET: MOCK_SECRET_VALUE,
    ADMIN_BOOTSTRAP_EMAIL: 'admin@example.com',
    GEMINI_API_KEY: MOCK_SECRET_VALUE,
    GEMINI_TEXT_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_TRANSCRIBE_MODEL: 'gemini-3.5-transcribe',
    GEMINI_TTS_MODEL: 'gemini-3.8-flash-lite-tts',
    GEMINI_TTS_VOICE: 'Kore',
    GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
    EMBEDDING_DIMENSIONS: '768',
    IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/demo',
    IMAGEKIT_PUBLIC_KEY: MOCK_SECRET_VALUE,
    IMAGEKIT_PRIVATE_KEY: MOCK_SECRET_VALUE,
    EMAIL_FROM: 'noreply@example.com',
  };
}

describe('Phase 0 — Config validation (SEC-7)', () => {
  it('validates a complete environment configuration', () => {
    const mockEnv = createValidMockEnv();
    const parsed = validateEnv(mockEnv);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.EMBEDDING_DIMENSIONS).toBe(768);
  });

  it('fails clearly when a required variable is missing and never prints values', () => {
    const mockEnv = createValidMockEnv();
    delete mockEnv.GEMINI_API_KEY;
    delete mockEnv.JWT_SECRET;

    const statusReport = formatEnvStatusReport(mockEnv);
    expect(statusReport).toContain('GEMINI_API_KEY: MISSING');
    expect(statusReport).toContain('JWT_SECRET: MISSING');
    expect(statusReport).toContain('DATABASE_URL: OK');
    expect(statusReport).not.toContain(MOCK_SECRET_VALUE);
    expect(statusReport).not.toContain('ep-main.neon.tech');

    let caughtError: Error | null = null;
    try {
      validateEnv(mockEnv);
    } catch (err) {
      caughtError = err as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('GEMINI_API_KEY');
    expect(caughtError?.message).toContain('JWT_SECRET');
    expect(caughtError?.message).not.toContain(MOCK_SECRET_VALUE);
  });

  it('rejects if TEST_DATABASE_URL equals DATABASE_URL', () => {
    const mockEnv = createValidMockEnv();
    mockEnv.TEST_DATABASE_URL = mockEnv.DATABASE_URL;

    expect(() => validateEnv(mockEnv)).toThrow(/TEST_DATABASE_URL must be distinct/);
  });
});
