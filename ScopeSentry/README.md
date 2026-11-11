# ScopeSentry — AI Construction Change Detective

> Construction Intelligence & Scope Discrepancy Platform for General Contractors, Project Managers, and Dispute Teams.

ScopeSentry autonomously flags scope creep, quantity deltas, unapproved specification deviations, and schedule variations between contract revisions before costly subcontractor disputes occur.

---

## 🏛 Architecture Overview

ScopeSentry is architected as a secure, high-integrity modular monolith:

- **Backend (`server/`):** Node.js & Express (ESM), MongoDB via Mongoose, Decimal arithmetic (`decimal.js`), LangGraph.js workflow orchestration, PDFKit report generation.
- **Frontend (`frontend/`):** React 18, Vite, Tailwind CSS, Lucide React icons, React Router v6, Axios.
- **AI & Retrieval Engine:** Hybrid search combining MongoDB Atlas Vector Search (`text-embedding-004`, 768 dimensions) and full-text keyword search merged via Reciprocal Rank Fusion ($RRF$, $k=60$).
- **File Storage:** Private ImageKit storage with time-limited authenticated signed URLs.

### Critical Business Rules Enforced Server-Side
1. **Mathematical Authority:** Gemini LLM never performs authoritative arithmetic. All quantities, unit price multiplications, and deltas are calculated in pure backend decimal code (`quantityDifference = revised - original`, `estimatedCostDifference = quantityDifference * unitPrice`).
2. **Deterministic Confidence & Grounding:** Citations require verified verbatim substring matching against chunk records. Fabricated quotes are discarded and flagged as `evidence_not_found`.
3. **Audit Ledger:** Append-only review history (`ReviewAction`). "Approved" indicates user PM verification, never a legal determination.
4. **Tenant Scoping:** Every query enforces strict owner scoping (`ownerId` and `projectId`). Foreign or cross-tenant IDs return HTTP 404.

---

## 🔐 Environment Variables

> **MANDATORY SECURITY NOTICE:** Never commit or expose secret values. Environment configuration is read by path from `server/env` and `frontend/env` (or `frontend/.env`).

### Backend (`server/env`) Variable Names
| Variable Name | Purpose | Example / Format |
|---|---|---|
| `PORT` | API server listen port | `5000` |
| `NODE_ENV` | Environment mode | `development` / `production` / `test` |
| `CLIENT_ORIGIN` | Allowed CORS origin of the frontend | `http://localhost:5173` or `https://app.scopesentry.com` |
| `MONGODB_URI` | Production MongoDB Atlas connection URI | `mongodb+srv://...` |
| `MONGODB_TEST_URI` | Isolated automated test database URI | `mongodb+srv://.../scopesentry_test` |
| `JWT_SECRET` | Secret key for HS256 authentication tokens | High-entropy string (min 32 chars) |
| `CSRF_SECRET` | Secret key for Double Submit CSRF cookies | High-entropy string |
| `GEMINI_API_KEY` | Google Gemini API key | Google AI Studio key |
| `GEMINI_CHAT_MODEL` | Gemini LLM model identifier | `gemini-1.5-flash` |
| `GEMINI_EMBEDDING_MODEL`| Gemini embedding model | `text-embedding-004` |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | `public_...` |
| `IMAGEKIT_PRIVATE_KEY`| ImageKit private API key | `private_...` |
| `IMAGEKIT_URL_ENDPOINT`| ImageKit upload endpoint URL | `https://ik.imagekit.io/...` |
| `SMTP_HOST` | Nodemailer SMTP server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `user@example.com` |
| `SMTP_PASS` | SMTP password | `password` |
| `SMTP_FROM` | Outgoing sender email address | `no-reply@scopesentry.com` |

### Frontend (`frontend/env` or `frontend/.env`) Variable Names
| Variable Name | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL pointing to the ScopeSentry backend API (e.g., `http://localhost:5000` or production Render URL) |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js 18+ LTS
- MongoDB Atlas cluster (or local MongoDB replica set)

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd ScopeSentry

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Seed Public Demo Data
To seed the 3 fictional canonical construction projects (Section 13) into your database:
```bash
cd server
npm run seed:demo
```

### 4. Running the Development Servers
```bash
# Terminal 1 - Backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## 🧪 Testing Suite & Quality Gates

ScopeSentry maintains a comprehensive automated testing suite:

```bash
# Run all server tests (Unit, API, Security, Full Flow)
cd server
npm run test

# Run Authorization Matrix Security Audit
npm run test -- tests/security/authMatrix.test.js

# Run Full Flow End-to-End Integration Suite
npm run test -- tests/api/fullFlow.test.js

# Static Checks and Linting
cd server && npm run lint
cd ../frontend && npm run lint

# Production Frontend Build
cd ../frontend && npm run build
```

---

## 🔍 MongoDB Atlas Search & Vector Search Index Setup

For full-text search and cosine semantic similarity in production, create the following indexes on the `documentchunks` collection in the MongoDB Atlas Web UI:

### 1. Vector Search Index (`vector_index`)
- **Collection:** `documentchunks`
- **Index Name:** `vector_index`
- **Definition:**
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "ownerId"
    },
    {
      "type": "filter",
      "path": "projectId"
    }
  ]
}
```

### 2. Atlas Search Index (`default`)
- **Collection:** `documentchunks`
- **Index Name:** `default`
- **Definition:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "text": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "sectionNumber": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "clauseNumber": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "ownerId": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "projectId": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

---

## 🚢 Production Deployment

### Backend (Render Web Service)
1. Create a new **Web Service** on [Render](https://render.com).
2. Root Directory: `server`
3. Environment: `Node`
4. Build Command: `npm install`
5. Start Command: `node src/server.js`
6. Set the production environment variables in the Render Dashboard (**never share values with AI agents**).
7. **Cold-Start Note:** On Render free/starter tiers, services spin down after 15 minutes of inactivity. First requests after idle may take 30–50 seconds. A health check ping (`GET /health`) can be configured via UptimeRobot.

### Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com).
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Set `VITE_API_BASE_URL` to your production backend Render URL (e.g. `https://scopesentry-api.onrender.com`).

---

## ⚖️ Legal & Limitations Notice
Per Section 12.4 of the ScopeSentry Specification:
> **ScopeSentry is an AI-assisted detection tool designed to accelerate human review. It is NOT an engineering authority, legal determination, or definitive claim verdict.** All cost calculations represent preliminary estimates based on extracted unit rates and require independent verification by certified project engineers before submission.
