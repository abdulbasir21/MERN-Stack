import { PrismaClient } from '@prisma/client';
import { env, getActiveDatabaseUrl } from '../config/env.js';

const activeUrl = getActiveDatabaseUrl(env, process.env.NODE_ENV);

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: activeUrl,
    },
  },
  log: ['error'],
});

export function getConfiguredPrismaUrl(): string {
  return getActiveDatabaseUrl(env, process.env.NODE_ENV);
}
