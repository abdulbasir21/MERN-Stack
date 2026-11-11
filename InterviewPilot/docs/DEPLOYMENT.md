# InterviewPilot — Production Deployment & Hardening Guide

This document details the production architecture, hosting setup, environment variables, provider quota limits, and disaster recovery procedures for **InterviewPilot**.

---

## 1. Production Architecture Overview

- **Frontend**: Next.js 14 App Router deployed on **Vercel**.
- **Backend API**: Node.js / Express TypeScript service deployed on **Render** (Web Service container or Docker runtime).
- **Database & Vector Store**: Serverless PostgreSQL with **pgvector** extension on **Neon**.
- **Storage**: Private file storage on **ImageKit** (zero public file exposure).
- **AI Services**: Google **Gemini API** (`gemini-2.5-flash` / `@google/genai`) and Talking Avatar SDK (`@interviewflowai/talking-avatar`).

---

## 2. Neon Database Configuration (PostgreSQL + pgvector)

1. **pgvector Activation**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. **Schema Deployment**:
   Run Prisma migrations against the Neon direct/unpooled connection:
   ```bash
   npx prisma migrate deploy
   ```
3. **Database Connection Pooling**:
   - `DATABASE_URL`: Neon pooled connection string (port 6543) with `pgbouncer=true`.
   - `DATABASE_URL_UNPOOLED`: Neon direct connection string (port 5432) for schema migrations.
4. **Neon Serverless Branching (Testing & Staging)**:
   - Automated tests run against an isolated branch database (`TEST_DATABASE_URL`).
   - Neon point-in-time recovery (PITR) enabled with 7-day retention.

---

## 3. Render Backend Deployment

1. **Service Type**: Render Web Service (Node.js Environment or Dockerfile).
2. **Build & Start Commands**:
   - Build Command:
     ```bash
     npm --workspace=@interviewpilot/shared run build && npm --workspace=@interviewpilot/server run build
     ```
   - Start Command:
     ```bash
     npm --workspace=@interviewpilot/server run start
     ```
3. **Health Check Endpoint**:
   - Path: `/api/health`
   - Expected status: `200 OK`
4. **Environment Variables on Render** (Names only; configure in Render Dashboard):
   - `NODE_ENV=production`
   - `PORT=4000`
   - `CLIENT_ORIGIN=https://your-interviewpilot-domain.vercel.app`
   - `DATABASE_URL` (Neon pooled string)
   - `DATABASE_URL_UNPOOLED` (Neon direct string)
   - `JWT_SECRET` (At least 32 cryptographically secure random bytes)
   - `COOKIE_SECRET`
   - `DEMO_IP_HASH_SECRET` (Used for HMAC SHA-256 IP hashing)
   - `GEMINI_API_KEY`
   - `GEMINI_TEXT_MODEL=gemini-2.5-flash`
   - `GEMINI_EMBEDDING_MODEL=text-embedding-004`
   - `IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`
   - `IMAGEKIT_URL_ENDPOINT`
   - `ADMIN_BOOTSTRAP_EMAIL`

---

## 4. Vercel Frontend Deployment

1. **Framework Preset**: Next.js.
2. **Root Directory**: `client` (or monorepo root with Root Directory set to `client`).
3. **Build Command**: `next build`
4. **Environment Variables on Vercel** (Names only):
   - `NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com`
   - `NEXT_PUBLIC_APP_URL=https://your-interviewpilot-domain.vercel.app`

---

## 5. Provider-Side Budget Limits Checklist

To ensure bulletproof fail-closed protection against unexpected billing, configure hard limits directly in provider consoles:

1. **Google Cloud Console (Gemini API)**:
   - Navigate to **Billing → Budgets & Alerts**.
   - Create a hard monthly budget alert at \$25.00 with disable-API trigger if ceiling is approached.
   - Enforce Quotas under **APIs & Services → Quotas**:
     - Maximum 15 requests per minute (RPM) for free tier.
2. **ImageKit Dashboard**:
   - Navigate to **Settings → Storage & Bandwidth Limits**.
   - Set monthly bandwidth cap and private storage limit (e.g. 10 GB).
3. **Neon PostgreSQL**:
   - Enable **Spend Controls** in project settings. Set maximum Compute Units (CU) to 0.5 – 1.0 to prevent runaway autoscale costs.

---

## 6. Backup & Disaster Recovery Procedures

### 6.1 Database Backup
- **Automated Snapshots**: Neon creates automatic point-in-time restore points.
- **Manual Logical Dump**:
  ```bash
  pg_dump --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL_UNPOOLED" -F c -f "backup_$(date +%Y%m%d).dump"
  ```

### 6.2 Database Restore
- **Restore from Dump**:
  ```bash
  pg_restore --clean --no-owner -d "$DATABASE_URL_UNPOOLED" "backup_20261112.dump"
  ```
- **Neon Branch Restore**: Neon console provides one-click restore to any second in the past 7 days.

---

## 7. Security Hardening & Zero-Leak Auditing Verification

InterviewPilot incorporates strict defense-in-depth protections verified in Phase 14:
- **SEC-1**: Every route checks auth → permission → scope/ownership → validate → act. Another user's resource strictly returns **404**, never 403.
- **SEC-2**: All payloads validated with strict Zod schemas; unexpected fields rejected with 400.
- **SEC-3**: HttpOnly, Secure, SameSite cookies with CSRF custom header (`X-Requested-With`) enforcement.
- **SEC-4**: Helmet security headers, CORS restricted to `CLIENT_ORIGIN`, global and AI rate limiters.
- **SEC-5**: File uploads verified by MIME type, extension, magic signature, and capped at 5 MB; stored in private access-controlled storage.
- **SEC-6**: Errors return generalized codes and sanitized messages without stack traces, database queries, or provider details.
- **SEC-7**: Secrets exclusively loaded from server `.env`; never present in client bundles, commit messages, or error payloads.
- **SEC-8**: Logs record IDs, codes, and durations; raw audio, full transcripts, and candidate documents are never logged.
