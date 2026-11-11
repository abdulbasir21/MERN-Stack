import { execSync } from 'node:child_process';
import { env } from '../src/config/env.js';

function ensureConnectTimeout(urlString: string): string {
  try {
    const url = new URL(urlString);
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '30');
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

function runMigrate(target: 'main' | 'test', retries = 3): void {
  const dbUrl = ensureConnectTimeout(target === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL);
  const directUrl = ensureConnectTimeout(
    target === 'test'
      ? env.TEST_DIRECT_URL || env.TEST_DATABASE_URL
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
      execSync('npx prisma migrate deploy', {
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
