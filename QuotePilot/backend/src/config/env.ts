import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { z } from 'zod';

// Ensure MongoDB Atlas SRV records resolve smoothly on Windows / local router DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Graceful fallback if system restricts setting DNS servers
}

// Load .env explicitly from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  
  MONGOURL: z.string().min(1, 'MONGOURL is required'),
  MONGOURL_TEST: z.string().optional(),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, 'IMAGEKIT_PUBLIC_KEY is required'),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, 'IMAGEKIT_PRIVATE_KEY is required'),
  IMAGEKIT_URL_ENDPOINT: z.string().url('IMAGEKIT_URL_ENDPOINT must be a valid URL'),
  
  EMAIL_PROVIDER: z.enum(['smtp', 'brevo-api']).default('smtp'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 587)),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('QuotePilot <no-reply@quotepilot.com>'),
  BREVO_API_KEY: z.string().optional(),
  
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  
  PLATFORM_ADMIN_EMAIL: z.string().email().default('admin@quotepilot.com'),
  PLATFORM_ADMIN_PASSWORD: z.string().min(8).default('AdminPassword123!'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid backend environment configuration:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
