# QuotePilot — B2B Service Marketplace & Multi-Company Quotation Platform

QuotePilot is an institutional service marketplace and quotation management platform built on the MERN stack with Next.js App Router (TypeScript strict, Tailwind CSS only, Framer Motion) and Express.js (TypeScript strict, Socket.io, Mongoose, Zod). Designed around Google Stitch UI Design System ("Paper & Ink" tactile aesthetic).

---

## Architecture Overview

```
                                      +-----------------------------+
                                      |      Next.js Frontend       |
                                      |   (App Router, Vercel)      |
                                      +--------------+--------------+
                                                     |
                                                     | REST & Sockets
                                                     v
                                      +-----------------------------+
                                      |     Express.js API Node     |
                                      |    (Socket.io, Render)      |
                                      +---+----------+----------+---+
                                          |          |          |
                   +----------------------+          |          +----------------------+
                   |                                 |                                 |
                   v                                 v                                 v
        +--------------------+            +--------------------+            +--------------------+
        |   MongoDB Atlas    |            |   Google Gemini    |            |       Brevo        |
        |  (Atlas Cluster)   |            | (Intake Validation |            |  (SMTP & HTTP API  |
        |                    |            |   & Desk Summary)  |            |   Notifications)   |
        +--------------------+            +--------------------+            +--------------------+
```

### Core Business Rules Enforced
- **BR-01 & BR-03**: Multi-company marketplace with strict tenant isolation. One administrator per company.
- **BR-04**: Public marketplace profiles restricted to platform-approved companies only.
- **BR-09**: AI gatekeeper validates client intake briefs and generates company desk summaries. AI **never** sets prices or binding covenants.
- **BR-10 & BR-11**: Official quotation slips are in-platform, tamper-resistant documents with milestone breakdown summing exactly to total amount. Single live quotation per inquiry with version history tracking.
- **BR-12**: Direct bilateral discussions and live messaging occur strictly within an inquiry docket.
- **BR-14**: Reviews & ratings are strictly permitted **only after** a formal quotation slip is accepted. Duplicate reviews on the same inquiry are blocked with HTTP 409 Conflict.

---

## Directory Layout

```
QuotePilot/
├── backend/
│   ├── src/
│   │   ├── config/              # Constants, env loader
│   │   ├── middleware/          # JWT auth, role guard, error handler, rate limiter
│   │   ├── models/              # User, Company, Service, Inquiry, Message, Quotation, Notification, Review
│   │   ├── modules/             # Auth, Companies, Services, Inquiries, Quotations, Notifications, Reviews, AI
│   │   ├── scripts/             # Idempotent seed script
│   │   └── tests/               # Vitest regression suites (44/44 tests passed)
│   ├── .env.example             # Backend environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 15 App Router pages (18 routes)
│   │   ├── components/          # Stitch "Paper & Ink" UI primitives, modals, loaders
│   │   ├── context/             # AuthContext with token session handling
│   │   └── lib/                 # Type-safe API client
│   ├── .env.example             # Frontend environment variable template
│   └── package.json
│
└── docs/                        # Approved product and technical specifications
```

---

## Environment Variables

### Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGOURL=mongodb+srv://<username>:<password>@mycluster.mongodb.net/QuotePilot
JWT_SECRET=<long-random-secret>

# ImageKit Media CDN
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...

# Email Service (Brevo / Nodemailer)
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM="QuotePilot <no-reply@quotepilot.com>"
BREVO_API_KEY=...

# Gemini AI Engine
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_URL_ENDPOINT=https://ik.imagekit.io/...
```

---

## Setup & Running

### 1. Install Dependencies
```bash
# Backend
npm --prefix backend install

# Frontend
npm --prefix frontend install
```

### 2. Seed Database
Runs the idempotent seed script creating approved provider companies, admin accounts, and services:
```bash
npm --prefix backend run seed
```

### 3. Run Development Servers
```bash
# Terminal 1: Backend Express + Socket.io (Port 5000)
npm --prefix backend run dev

# Terminal 2: Frontend Next.js App Router (Port 3000)
npm --prefix frontend run dev
```

### 4. Run Test Suites
All test suites run against real MongoDB Atlas database with fallback resilience:
```bash
npm --prefix backend test src/tests/inquiry.test.ts src/tests/desk.test.ts src/tests/quotation.test.ts src/tests/message.test.ts src/tests/notification.test.ts src/tests/review.test.ts
```

### 5. Production Builds
```bash
# Backend TypeScript Compilation
npm --prefix backend run build

# Frontend Next.js Production Build
npm --prefix frontend run build
```

---

## Seed Accounts

| Role | Email | Password | Scope |
|------|-------|----------|-------|
| Platform Admin | `admin@quotepilot.com` | `AdminPass123!` | System Approvals & Governance |
| Company Admin | `admin@pixelpine.com` | `CompanyPass123!` | Pixel & Pine Studio (Design/Web) |
| Company Admin | `admin@hearthinteriors.com` | `CompanyPass123!` | Hearth Interiors (Architecture) |
| Customer Client | `client1@example.com` | `CustomerPass123!` | Commercial Procurement Client |

---

## Render & Vercel Realities

1. **Render Free Tier Cold-Start**:
   The backend on Render spins down after ~15 minutes of inactivity. The frontend includes responsive network fallbacks to notify users during instance warm-up (~40-60s).
2. **SMTP Port Blocking on Render**:
   Render blocks outbound SMTP ports (25/465/587). In production, set `EMAIL_PROVIDER=brevo-api` and configure `BREVO_API_KEY` to route emails through the Brevo REST API.
3. **Stateless Backend**:
   Session state and file storage are decoupled. ImageKit manages image hosting, and MongoDB Atlas stores all inquiry histories and quotation audit trails.
