import { rateLimit } from '@/lib/rateLimit';

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const result = rateLimit('test-key-1', 5, 60000);
    expect(result.blocked).toBe(false);
  });

  it('blocks after exceeding the limit', () => {
    const key = 'test-key-2';
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60000);
    const result = rateLimit(key, 5, 60000);
    expect(result.blocked).toBe(true);
  });

  it('returns retryAfter when blocked', () => {
    const key = 'test-key-3';
    for (let i = 0; i < 6; i++) rateLimit(key, 5, 60000);
    const result = rateLimit(key, 5, 60000);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
