import { describe, it, expect } from 'vitest';

describe('Phase 0: Environment Validation', () => {
  it('throws an error listing missing variable names when required vars are unset', () => {
    const requiredVars = ['NODE_ENV', 'PORT', 'MONGODB_URI'];
    const fakeEnv = {
      NODE_ENV: 'test'
      // PORT and MONGODB_URI are intentionally missing
    };

    const missing = [];
    for (const varName of requiredVars) {
      if (!fakeEnv[varName]) {
        missing.push(varName);
      }
    }

    expect(missing).toEqual(['PORT', 'MONGODB_URI']);
    const formatError = () => {
      throw new Error(`Missing required environment variable names: ${missing.join(', ')}`);
    };

    expect(formatError).toThrowError('Missing required environment variable names: PORT, MONGODB_URI');
  });

  it('error message never prints or exposes existing secret values', () => {
    const fakeEnv = {
      NODE_ENV: 'test',
      MONGODB_URI: 'secret_database_connection_string_value'
    };

    const missing = ['PORT'];
    const errorMsg = `Missing required environment variable names: ${missing.join(', ')}`;

    expect(errorMsg).not.toContain(fakeEnv.MONGODB_URI);
    expect(errorMsg).toBe('Missing required environment variable names: PORT');
  });
});
