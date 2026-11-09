import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: z.string().min(1, 'DATABASE_URL_UNPOOLED is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  SEED_OWNER_EMAIL: z.string().email().optional(),
  SEED_OWNER_PASSWORD: z.string().min(6).optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Report missing variable names without exposing any values
  const missingKeys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Environment validation failed. Problematic variables: ${missingKeys}`);
}

export const env = parsed.data;
