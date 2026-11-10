import { execSync } from 'node:child_process';
import { env } from '../src/config/env.js';

function runMigrate(target: 'main' | 'test'): void {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: target === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL,
    DATABASE_URL_UNPOOLED:
      target === 'test'
        ? env.TEST_DIRECT_URL || env.TEST_DATABASE_URL
        : env.DIRECT_URL,
  };

  console.info(`[MIGRATE] Applying migrations to ${target} database...`);
  execSync('npx prisma migrate deploy', {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnv,
  });
  console.info(`[MIGRATE] ${target} database migrations applied successfully.`);
}

runMigrate('main');
runMigrate('test');
