import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, getConfiguredPrismaUrl, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { env } from '../../src/config/env.js';

describe('Phase 0 — Test Database Connection & pgvector Extension', () => {
  beforeAll(async () => {
    await ensureDatabaseConnected();
  });
  it('uses TEST_DATABASE_URL and never the main DATABASE_URL in tests', () => {
    const activeUrl = getConfiguredPrismaUrl();
    expect(activeUrl).toBe(env.TEST_DATABASE_URL);
    expect(activeUrl).not.toBe(env.DATABASE_URL);
  });

  it('connects to test database and confirms pgvector extension is enabled', async () => {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].extname).toBe('vector');
  });
});
