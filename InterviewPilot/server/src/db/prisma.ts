import { PrismaClient } from '@prisma/client';
import { env, getActiveDatabaseUrl } from '../config/env.js';

const activeUrl = getActiveDatabaseUrl(env, process.env.NODE_ENV);

function ensureConnectTimeout(urlString: string): string {
  try {
    const url = new URL(urlString);
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '30');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '60');
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: ensureConnectTimeout(activeUrl),
    },
  },
  log: ['error'],
});

export function getConfiguredPrismaUrl(): string {
  return getActiveDatabaseUrl(env, process.env.NODE_ENV);
}

/**
 * Robust connection helper to wake up sleeping Neon serverless branches.
 */
export async function ensureDatabaseConnected(
  maxRetries = 8,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
