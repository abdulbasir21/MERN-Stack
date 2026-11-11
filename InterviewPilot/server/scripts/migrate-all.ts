import { execSync } from 'node:child_process';
import { env } from '../src/config/env.js';

function ensureConnectTimeout(urlString: string): string {
  if (!urlString) return urlString;
  let result = urlString;
  if (!result.includes('connect_timeout=')) {
    const sep = result.includes('?') ? '&' : '?';
    result = `${result}${sep}connect_timeout=30`;
  }
  return result;
}

function runMigrate(target: 'main' | 'test', retries = 3): void {
  const isTestSchema = target === 'test' && process.env.TEST_USE_SCHEMA_ISOLATION === 'true';
  const defaultTestUrl = isTestSchema
    ? `${env.DATABASE_URL}${env.DATABASE_URL.includes('?') ? '&' : '?'}schema=test_suite`
    : env.TEST_DATABASE_URL;

  const dbUrl = ensureConnectTimeout(target === 'test' ? defaultTestUrl : env.DATABASE_URL);
  const directUrl = ensureConnectTimeout(
    target === 'test'
      ? (isTestSchema ? defaultTestUrl : (env.TEST_DIRECT_URL || env.TEST_DATABASE_URL))
      : env.DIRECT_URL
  );

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: dbUrl,
    DATABASE_URL_UNPOOLED: directUrl,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.info(`[MIGRATE] Applying migrations to ${target} database (attempt ${attempt}/${retries})...`);
      execSync('npx prisma migrate deploy --schema server/prisma/schema.prisma', {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: childEnv,
      });
      console.info(`[MIGRATE] ${target} database migrations applied successfully.`);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[MIGRATE] Attempt ${attempt} failed, retrying in 3s...`);
      const delayMs = 3000;
      const start = Date.now();
      while (Date.now() - start < delayMs) {
        // synchronous spin wait
      }
    }
  }
}

runMigrate('main');
runMigrate('test');
