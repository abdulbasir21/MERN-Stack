# CrewDesk (Enterprise Agency ERP)

CrewDesk is an enterprise-grade, single-company full-stack ERP purpose-built for software and digital design agencies. It integrates workforce administration, project operations, finance, and hardware logistics into a unified, role-governed platform designed according to the *Executive Precision* design system.

---

## 🏛 System Architecture & Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui components, TanStack Query v5, React Hook Form, Zod validation, Recharts, React Router v6, Motion.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM (v6), PostgreSQL (Neon Serverless).
- **Authentication & Security**:
  - Dual-token auth: short-lived Access Token (15m) + rotated Refresh Token (7d) stored in secure `httpOnly`, `sameSite` cookies.
  - Server-side RBAC middleware (`requirePermission`) with a central permission map.
  - Helmet security headers, scoped CORS, and bcrypt password hashing (10 salt rounds).
  - Rate-limited authentication endpoints.
- **File Storage**: ImageKit SDK (dedicated avatar upload buffer with MIME verification and old image deletion).
- **Database Architecture**:
  - Money stored strictly in Prisma `Decimal(12, 2)` (zero floating point inaccuracies).
  - Computed business values (invoice status, balance, working hours, task progress) are derived dynamically at runtime and never persisted as stale denormalized columns.

---

## 👥 Roles & Demo Credentials

CrewDesk enforces strict separation of concerns across 6 distinct roles. The comprehensive demo database is pre-seeded with one active executive per role.

**Default Master Password for all demo accounts**: `CrewDesk2026!`

| Role | Demo Email | Access Scope & Primary Responsibilities | Strict Boundary (Cannot Access) |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@crewdesk.agency` | Full agency oversight, company settings, financial reports, append-only audit trail, manager promotions | *None (Unrestricted)* |
| **HR Manager** | `hr@crewdesk.agency` | Employee onboarding, department structures, leave requests approval, attendance adjustments | Cannot view financial invoices/cash flow or modify company settings |
| **Project Manager** | `pm@crewdesk.agency` | Client management, projects, milestones, task assignments, project budget tracking | Cannot approve company leaves, record company expenses, or view audit logs |
| **Finance Manager** | `finance@crewdesk.agency` | Invoices, client payments, agency expenses, profit/loss calculations | Cannot manage inventory, assign assets, or approve leave |
| **Inventory Manager**| `inventory@crewdesk.agency` | Hardware assets lifecycle, serialized custody, consumable stock movements | Cannot view financial cash flow, edit tasks, or view audit logs |
| **Employee** | `employee@crewdesk.agency` | Personal attendance punch, assigned project tasks, personal leave requests, assigned hardware | Cannot view other users' records, finances, settings, or audit logs |

---

## 🗄 Database Entity Relationship Summary (ERD)

```
[ CompanySettings ] (1)
        │
[ Department ] (1) ──────────< [ User ] (N)
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
[ LeaveBalance ]             [ Attendance ]               [ Notification ]
[ LeaveRequest ]             [ RefreshToken ]             [ AuditLog ]
      │
      ▼
[ Client ] (1) ──────────────< [ Project ] (N)
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
[ Milestone ]                 [ Task ]                      [ Invoice ]
                                   │                             │
                              [ TaskComment ]               [ Payment ]
                                                                 │
                                                            [ Expense ]
[ InventoryItem ] (Kind: ASSET | STOCK)
      ├──< [ AssetAssignment ] (User custody history)
      └──< [ StockMovement ]   (In / Out / Adjustment logs)
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database (or Neon Postgres instance)

### 2. Environment Configuration
Create `.env` in `server/` and `client/` directories based on the example templates:

**`server/.env.example`**:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host/neondb?sslmode=require"
JWT_ACCESS_SECRET="your_long_random_jwt_access_secret_here"
JWT_REFRESH_SECRET="your_long_random_jwt_refresh_secret_here"
IMAGEKIT_PUBLIC_KEY="your_imagekit_public_key"
IMAGEKIT_PRIVATE_KEY="your_imagekit_private_key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"
```

**`client/.env.example`**:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Installation & Database Setup
```bash
# 1. Install root dependencies
npm install

# 2. Run migrations against direct/unpooled Neon database
npm --prefix server run prisma:migrate

# 3. Seed comprehensive demonstration data (all 6 roles, projects, tasks, invoices, assets)
npm --prefix server run seed:demo
```

### 4. Running the Development Servers
```bash
# Start backend API (http://localhost:5000)
npm run dev:server

# Start frontend application (http://localhost:5173)
npm run dev:client
```

---

## 🧪 Testing & Verification

CrewDesk includes 12 comprehensive automated test suites covering security, authorization, and business rules:

```bash
# Run all server test suites
npm --prefix server run test

# Type-check TypeScript codebase
npm --prefix server run typecheck
npm --prefix client run build

# Run linting
npm --prefix server run lint
```

### Test Suites Overview:
- `attendance.test.ts`: Single record per day, automated working hours calculation, late detection with grace periods.
- `auth.test.ts`: Password hashing, JWT cookie lifecycle, rotated refresh tokens, temporary password enforcement.
- `dashboard.test.ts`: Role-tailored metrics scoping for all 6 roles.
- `finance.test.ts`: Derived invoice statuses, Decimal precision math, payment overpayment prevention, 1-tx audit logging.
- `inventory.test.ts`: Serialized asset tracking, negative stock prevention, user deactivation blocking when holding assets.
- `leave.test.ts`: Weekday-only counting, overlap prevention, balance deductions, self-approval prevention.
- `permissions.test.ts`: Complete RBAC permission matrix verification row-by-row.
- `projects.test.ts`: Scoped project view and edit permissions per role.
- `system.test.ts`: Append-only audit logs, Owner settings updates, notification polling.
- `tasks.test.ts`: Assignee membership validation, task progress calculation, comment threads.
- `users.test.ts`: User lifecycle, role management, avatar upload validation.

---

## 🌐 Production Deployment Guide

### Database (Neon PostgreSQL)
1. In Neon Console, obtain both your **Pooled connection string** (for runtime `DATABASE_URL`) and **Direct / Unpooled connection string** (for `DATABASE_URL_UNPOOLED` in Prisma migrations).
2. Ensure SSL mode is enabled (`sslmode=require`).

### Backend (Render Web Service)
1. Create a new **Web Service** pointing to the repository root.
2. Root Directory: `server`
3. Build Command: `npm install && npm run build`
4. Start Command: `node dist/server.js`
5. Environment Variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `CLIENT_URL=https://your-crewdesk-frontend.vercel.app`
   - `DATABASE_URL` (Neon pooled URL)
   - `DATABASE_URL_UNPOOLED` (Neon direct URL)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
   - `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`

### Frontend (Vercel)
1. Import repository on Vercel.
2. Root Directory: `client`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL=https://your-crewdesk-backend.onrender.com/api`
7. Single-Page Application (SPA) routing is configured via `client/vercel.json` rewrite rules to route all paths to `/index.html`.
