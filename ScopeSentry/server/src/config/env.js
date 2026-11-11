import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit path to server/env (two levels up from src/config)
const explicitEnvPath = path.resolve(__dirname, '../../env');

dotenv.config({ path: explicitEnvPath });

// Required variable names for server execution
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI'
];

const missing = [];
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    missing.push(varName);
  }
}

if (missing.length > 0) {
  throw new Error(`Missing required environment variable names: ${missing.join(', ')}`);
}

// Normalized configuration (no secret values logged or leaked)
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.NODE_ENV === 'test' && process.env.MONGODB_TEST_URI
    ? process.env.MONGODB_TEST_URI
    : process.env.MONGODB_URI,
  mongoDbName: process.env.NODE_ENV === 'test'
    ? (process.env.MONGODB_TEST_DB_NAME || 'scopesentry_test')
    : (process.env.MONGODB_DB_NAME || 'scopesentry'),
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'fallback-dev-secret-min-32-chars-long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  csrfSecret: process.env.CSRF_SECRET || 'fallback-csrf-secret-min-32-chars-long',
  cookieSameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || process.env.MAX_FILE_SIZE_MB || '10', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_URL_ENDPOINT || ''
};
