import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const REQUIRED_SERVER_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'CLIENT_ORIGIN',
  'DATABASE_URL',
  'TEST_DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'DEMO_IP_HASH_SECRET',
  'ADMIN_BOOTSTRAP_EMAIL',
  'GEMINI_API_KEY',
  'GEMINI_TEXT_MODEL',
  'GEMINI_TRANSCRIBE_MODEL',
  'GEMINI_TTS_MODEL',
  'GEMINI_TTS_VOICE',
  'GEMINI_EMBEDDING_MODEL',
  'EMBEDDING_DIMENSIONS',
  'IMAGEKIT_URL_ENDPOINT',
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'EMAIL_FROM',
] as const;

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().min(1),
  TEST_DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  DEMO_IP_HASH_SECRET: z.string().min(1),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_TEXT_MODEL: z.string().min(1),
  GEMINI_TRANSCRIBE_MODEL: z.string().min(1),
  GEMINI_TTS_MODEL: z.string().min(1),
  GEMINI_TTS_VOICE: z.string().min(1),
  GEMINI_EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),
  IMAGEKIT_URL_ENDPOINT: z.string().url(),
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  EMAIL_HOST: z.string().min(1).optional(),
  EMAIL_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASS: z.string().min(1).optional(),
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export interface EnvCheckItem {
  name: string;
  status: 'OK' | 'MISSING';
}

/**
 * Inspects environment variables and returns ONLY variable names and OK/MISSING status.
 * NEVER includes or logs any values (SEC-7).
 */
export function checkEnvStatus(rawEnv: Record<string, string | undefined> = process.env): {
  items: EnvCheckItem[];
  missing: string[];
} {
  const items: EnvCheckItem[] = [];
  for (const key of REQUIRED_SERVER_ENV_KEYS) {
    const val = rawEnv[key];
    const isPresent = typeof val === 'string' && val.trim().length > 0;
    items.push({ name: key, status: isPresent ? 'OK' : 'MISSING' });
  }

  const hasDirectUrl =
    (typeof rawEnv.DIRECT_URL === 'string' && rawEnv.DIRECT_URL.trim().length > 0) ||
    (typeof rawEnv.DATABASE_URL_UNPOOLED === 'string' &&
      rawEnv.DATABASE_URL_UNPOOLED.trim().length > 0);
  items.push({ name: 'DIRECT_URL', status: hasDirectUrl ? 'OK' : 'MISSING' });

  const missing = items.filter((i) => i.status === 'MISSING').map((i) => i.name);
  return { items, missing };
}

export function formatEnvStatusReport(
  rawEnv: Record<string, string | undefined> = process.env
): string {
  const { items } = checkEnvStatus(rawEnv);
  return items.map((item) => `${item.name}: ${item.status}`).join('\n');
}

export function validateEnv(
  rawEnv: Record<string, string | undefined> = process.env,
  options: { logStatus?: boolean } = { logStatus: false }
): ServerEnv {
  const { items, missing } = checkEnvStatus(rawEnv);

  if (options.logStatus) {
    for (const item of items) {
      console.info(`[ENV] ${item.name}: ${item.status}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Environment validation failed. Missing required variables: ${missing.join(', ')}`
    );
  }

  const normalizedInput: Record<string, string | undefined> = {
    ...rawEnv,
    DIRECT_URL: rawEnv.DIRECT_URL || rawEnv.DATABASE_URL_UNPOOLED,
    TEST_DIRECT_URL: rawEnv.TEST_DIRECT_URL || rawEnv.TEST_DATABASE_URL_UNPOOLED,
  };

  const parsed = ServerEnvSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    const invalidKeys = Array.from(
      new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'UNKNOWN'))
    );
    throw new Error(
      `Environment validation failed. Invalid configuration for variables: ${invalidKeys.join(', ')}`
    );
  }

  if (parsed.data.TEST_DATABASE_URL === parsed.data.DATABASE_URL) {
    throw new Error(
      'Environment validation failed: TEST_DATABASE_URL must be distinct from DATABASE_URL'
    );
  }

  return parsed.data;
}

export function getActiveDatabaseUrl(
  env: ServerEnv,
  nodeEnv: string = env.NODE_ENV
): string {
  if (nodeEnv === 'test') {
    if (!env.TEST_DATABASE_URL || env.TEST_DATABASE_URL === env.DATABASE_URL) {
      throw new Error('Test database URL must be set and separate from main DATABASE_URL');
    }
    return env.TEST_DATABASE_URL;
  }
  return env.DATABASE_URL;
}

export const env = validateEnv(process.env, { logStatus: false });
