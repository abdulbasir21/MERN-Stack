import { describe, it, expect } from 'vitest';
import { env } from '../config/env';
import { SERVICE_CATEGORIES, USER_ROLES } from '../config/constants';

describe('Phase 0: Environment & Constants Configuration', () => {
  it('loads valid required environment variables', () => {
    expect(env.PORT).toBeDefined();
    expect(env.MONGOURL).toBeDefined();
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.GEMINI_API_KEY).toBeDefined();
    expect(env.IMAGEKIT_PUBLIC_KEY).toBeDefined();
    expect(env.IMAGEKIT_PRIVATE_KEY).toBeDefined();
    expect(env.IMAGEKIT_URL_ENDPOINT).toContain('imagekit.io');
  });

  it('contains expected service categories and roles', () => {
    expect(SERVICE_CATEGORIES).toContain('Web Development');
    expect(SERVICE_CATEGORIES).toContain('Interior Design');
    expect(USER_ROLES).toContain('customer');
    expect(USER_ROLES).toContain('company_admin');
    expect(USER_ROLES).toContain('platform_admin');
  });
});
