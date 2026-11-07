# QuotePilot — Complete Technical Overview & Architecture Blueprint

**QuotePilot** is an institutional-grade, multi-company service marketplace and bilateral quotation covenant management platform built on the MERN stack (Next.js, Express.js, MongoDB Atlas, Node.js) with Google Gemini AI and WebSockets.

---

## 1. Executive Summary & Core Mission

### The Business Problem
In traditional freelance marketplaces (e.g., Upwork, Fiverr, local classifieds):
1. **Unqualified Briefs:** Clients submit vague, one-line inquiries (*"Build an app for my store"*), forcing service providers to spend days extracting requirements before providing an estimate.
2. **Arbitrary Pricing & Scope Creep:** Without formal milestones, agreements devolve into disputes over deliverables, payment timing, and scope boundaries.
3. **No In-Platform Quotation Standard:** Quotations are scattered across email attachments, Word files, and PDFs, making them impossible to audit, track, or integrate with milestone escrow payments.
4. **Unregulated Provider Market:** Anyone can list services without commercial registration, vetting, or accountability covenants.

### The QuotePilot Solution
QuotePilot structures the commercial services market through:
- **SECP-Tier Institutional Vetting:** Only verified, commercial agencies and studios are approved to offer services.
- **AI Gatekeeper (Google Gemini):** Audits client inquiry briefs in real time against the provider's specific checklist *before* submission, flagging missing technical specifications and preventing gibberish text.
- **In-Platform Milestone Quotation Covenants:** Replaces loose PDFs with binding, version-controlled milestone slips containing itemized deliverables, payment milestones, and estimated delivery dates.
- **Bilateral Escrow Simulation (Meezan Escrow):** Milestone funds are locked and released sequentially upon milestone sign-off.
- **Real-Time Room-Based Sockets:** High-security bilateral chat strictly scoped within authorized inquiry dockets.

---

## 2. Technology Stack & Component Justification

### Frontend Stack (`QuotePilot/frontend`)

| Technology / Library | Version | Purpose in QuotePilot | Where Used in Codebase | Problem Solved | Integration Points |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Next.js** | `^15.1.7` (App Router) | Production React framework providing hybrid static and client-side routing, asset bundling, and image optimization. | `frontend/src/app/*`, `layout.tsx` | Eliminates complex client-side routing setups; provides SEO metadata and fast routing. | Wraps React 19, Tailwind, and connects to Express backend. |
| **React** | `^19.0.0` | Declarative UI library for component-based reactive user interfaces. | Entire frontend | Simplifies UI state management and reactive rendering. | Foundation for all Next.js App Router views. |
| **React DOM** | `^19.0.0` | Browser DOM renderer for React. | Entry points and Next.js internal hydration. | Bridges React virtual DOM to native browser DOM. | Hydrates server-rendered markup on the client. |
| **Tailwind CSS** | `^3.4.17` | Utility-first CSS framework with custom design tokens. | `globals.css`, `tailwind.config.ts`, all components | Replaces heavy CSS files with deterministic utility classes; strictly prevents runtime CSS bloat. | Implements QuotePilot aesthetic tokens (`brand-teal`, `paper-canvas`, `ink-primary`). |
| **Framer Motion** | `^12.4.3` | Animation engine for multi-plane parallax scrolling, hover micro-interactions, and modal transitions. | `src/app/page.tsx`, `QuotationSlipModal.tsx`, `ReviewModal.tsx` | Adds fluid, institutional visual hierarchy and delightful transitions without heavy canvas libraries. | Hooks into Next.js client components via `useScroll` and `useTransform`. |
| **Lucide React** | `^0.475.0` | Consistent, lightweight SVG iconography. | Across all views, buttons, status indicators, and loaders | Standardizes icons across marketplace, desk workspaces, and admin panels. | Imported directly into UI components (`Loader2`, `ShieldCheck`, `Scale`, etc.). |
| **Socket.io Client** | `^4.8.1` | Real-time WebSocket connection to backend. | `src/app/inquiries/[id]/page.tsx`, `src/app/company/inquiries/[id]/page.tsx` | Enables live messaging without slow polling. | Handshakes with Express backend using JWT authentication. |
| **Zod** | `^3.24.2` | TypeScript-first schema declaration and validation. | Form handlers and type definitions | Prevents malformed user submissions before making network requests. | Matches validation schemas defined in the backend. |

### Backend Stack (`QuotePilot/backend`)

| Technology / Library | Version | Purpose in QuotePilot | Where Used in Codebase | Problem Solved | Integration Points |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `>=20.x` | High-performance asynchronous JavaScript runtime. | Entire backend | Handles concurrent I/O operations (database queries, Gemini AI calls, WebSockets). | Executes Express server and manages socket lifecycle. |
| **Express.js** | `^4.21.2` | Minimalist web application framework for REST APIs. | `backend/src/app.ts`, `backend/src/server.ts`, all route files | Provides robust routing, middleware chaining, and clean request/response lifecycles. | Hosts feature modules and attaches to HTTP/Socket.io server. |
| **TypeScript** | `^5.7.3` | Strongly-typed superset of JavaScript. | All backend files | Eliminates runtime type errors and enforces strict data contract boundaries. | Compiles via `tsc` to CommonJS in `dist/`. |
| **MongoDB / Mongoose** | `^8.10.1` | NoSQL document database with schema modeling and validation. | `backend/src/models/*`, `server.ts` | Stores complex hierarchical data (e.g., quotations with embedded milestones and version history). | Connects to MongoDB Atlas cluster via Mongoose models. |
| **@google/genai** | `^2.32.0` | Official Google Gemini SDK for modern LLM calls. | `backend/src/modules/ai/gemini.service.ts` | Powers the AI Gatekeeper brief validation and inquiry summarization. | Calls `gemini-2.5-flash` with structured JSON output enforcement. |
| **Socket.io** | `^4.8.1` | Real-time bidirectional event-based communication. | `backend/src/server.ts` | Allows instant communication inside inquiry rooms with tenant isolation. | Mounted on Node `http.Server`; authenticates via JWT handshake. |
| **jsonwebtoken** | `^9.0.2` | Cryptographic JWT token generation and verification. | `backend/src/middleware/auth.ts`, `backend/src/utils/auth.ts` | Stateless authentication across HTTP requests and WebSocket handshakes. | Used by client `api.ts` in `Authorization: Bearer <token>`. |
| **bcrypt** | `^5.1.1` | Salted hashing algorithm for user passwords. | `backend/src/modules/auth/auth.service.ts` | Prevents plaintext password exposure in the database. | Hashes passwords on registration; compares hashes on login. |
| **ImageKit SDK** | `^6.0.0` | Cloud media storage, asset optimization, and CDN delivery. | `backend/src/modules/uploads/*` | Securely manages company logos and portfolio gallery images without exposing private API keys. | Generates client upload signatures and stores CDN URLs in MongoDB. |
| **Nodemailer** | `^6.10.0` | Email delivery service abstraction. | `backend/src/modules/notifications/email.service.ts` | Sends notification emails for inquiry updates, quotation approvals, and reviews. | Operates over SMTP in development and Brevo HTTP API in production. |
| **Helmet** | `^8.0.0` | HTTP security headers middleware. | `backend/src/app.ts` | Protects Express from well-known web vulnerabilities (XSS, clickjacking, MIME sniffing). | Intercepts all incoming HTTP requests at the root middleware layer. |
| **CORS** | `^2.8.5` | Cross-Origin Resource Sharing middleware. | `backend/src/app.ts` | Controls which frontend domains can communicate with the backend. | Configured with dynamic regex for `*.vercel.app` and localhost. |
| **express-rate-limit** | `^7.5.0` | API rate limiting middleware. | `backend/src/middleware/rateLimit.ts` | Protects authentication and AI endpoints against brute force and abuse. | Blocks IP addresses exceeding request thresholds with HTTP 429. |

---

## 3. High-Level System Architecture

```
                                  +------------------------------------+
                                  |         User Web Browser           |
                                  |  (Next.js 15 + Tailwind CSS + UI)  |
                                  +-----------------+------------------+
                                                    |
                         +--------------------------+--------------------------+
                         | HTTP / REST API (45s timeout)                      | WebSocket (WSS)
                         | Authorization: Bearer <JWT>                         | Handshake Token
                         v                                                     v
          +------------------------------+                       +-----------------------------+
          |     Express.js API Layer     |                       |    Socket.io Server Layer   |
          |  (Render.com Web Service)    |                       |  (Room-based Bilateral Hub) |
          +--------------+---------------+                       +--------------+--------------+
                         |                                                      |
      +------------------+------------------+                                   |
      | Middleware Chain:                    |                                  |
      | - Request ID (UUID)                  |                                  |
      | - Helmet Security Headers            |                                  |
      | - Dynamic CORS (*.vercel.app)        |                                  |
      | - Body Parser (100kb limit)          |                                  |
      | - Rate Limiter (express-rate-limit)  |                                  |
      | - JWT Authentication & RBAC          |                                  |
      | - Zod Payload Validation             |                                  |
      +------------------+------------------+                                   |
                         |                                                      |
                         v                                                      |
          +------------------------------+                                      |
          | Controllers & Services Layer |<-------------------------------------+
          +---+----------+-----------+---+
              |          |           |
              |          |           +------------------------------------------+
              v          v                                                      v
     +------------+ +-------------+ +--------------------+             +------------------+
     |  Mongoose  | |  Google     | | ImageKit Media CDN |             | Email Service    |
     |  ODM Layer | |  Gemini AI  | | (Portfolio & Logos)|             | (Brevo / SMTP)   |
     +-----+------+ +-------------+ +--------------------+             +------------------+
           |
           v
  +-----------------+
  |  MongoDB Atlas  |
  |  Cloud Database |
  +-----------------+
```

---

## 4. Frontend Architecture & Flow

### 1. Application Startup & Entry Points
- **Root Layout (`src/app/layout.tsx`):**
  - Configures font families (`Newsreader` serif for institutional elegance and `DM Sans` for readable UI).
  - Mounts the `AuthProvider` so the entire component tree has access to authentication state.
  - Injects the `FirstVisitLoader` component (branded luxury loader on first visit per session).
- **Global Styles (`src/app/globals.css`):**
  - Defines QuotePilot's tailored color variables: `brand-teal` (`#0F5C5C`), `paper-canvas` (`#FAF8F4`), `ink-primary` (`#1B2430`), and semantic alert colors.
  - Sets up CSS animation keyframes for pulse, shimmer, and spinners.

### 2. Client Routing Structure (Next.js App Router)

| Route Path | Access Level | Description & Core Features |
| :--- | :--- | :--- |
| `/` | Public | Marketplace Homepage: Hero parallax banner, stats ticker, commercial discipline grid, featured approved studios, escrow workflow. |
| `/companies` | Public | Verified Companies Directory: Search by studio name/keyword, filter by category and city, sort by rating/price. Live cloud wake-up loader banner. |
| `/companies/[slug]` | Public | Public Company Docket: Verified badges, company biography, portfolio gallery with preview modal, service list, starting floor, reviews. |
| `/login` | Public | Authentication: Email/password sign-in with redirect preservation (`/login?redirect=...`). |
| `/register` | Public | Customer Sign-up: Creates customer account and automatically initiates session. |
| `/register-company` | Authenticated | Company Registration: Creates pending company profile and assigns user as `company_admin`. |
| `/inquire` | Authenticated (Customer) | Intake Brief Form: Service selection, budget, deadline, requirements brief, **AI Gatekeeper live audit**. |
| `/inquiries` | Authenticated (Customer) | Client Inquiries Dashboard: Status badges, counter statistics, links to bilateral discussion rooms. |
| `/inquiries/[id]` | Authenticated (Customer) | Client Bilateral Docket: Real-time Socket.io chat, view received Quotation Slip, Accept/Reject actions, Escrow milestone release, Review submission modal. |
| `/company` | Authenticated (`company_admin`) | Company Workspace Hub: Overview cards, quick links to services, inquiries, reviews, and status. |
| `/company/status` | Authenticated (`company_admin`) | Company Approval Tracker: Shows current status (`pending`, `approved`, `rejected`), rejection reasons, SECP compliance guidelines. |
| `/company/profile` | Authenticated (`company_admin`) | Studio Profile Management: Edit tagline, description, city, contact info, logo upload, and portfolio management. |
| `/company/services` | Authenticated (`company_admin`) | Service Catalog Management: Create/edit services, set pricing units, define requirements checklists for AI Gatekeeper. |
| `/company/inquiries` | Authenticated (`company_admin`) | Studio Inquiry Inbox: Triage incoming leads, view AI Brief Summaries, track quotation status. |
| `/company/inquiries/[id]` | Authenticated (`company_admin`) | Studio Bilateral Docket: Real-time chat, AI inquiry summary sidebar, link to create/revise Quotation Slip. |
| `/company/inquiries/[id]/quote` | Authenticated (`company_admin`) | Quotation Builder: Add milestones, deliverables, amounts, delivery days, payment terms. Enforces BR-09 (Human-only pricing). |
| `/company/reviews` | Authenticated (`company_admin`) | Studio Review Log: View verified client feedback, ratings, and comments. |
| `/admin/companies` | Authenticated (`platform_admin`) | Platform Vetting Console: Review pending company applications, approve or reject with detailed feedback. |

### 3. State Management & API Communication Layer
- **`AuthContext.tsx` (`src/context/AuthContext.tsx`):**
  - Manages authenticated user state (`id`, `name`, `email`, `role`, `companyId`).
  - Stores JWT token in browser `localStorage` (`quotepilot_token`).
  - Implements global `logout()`: Clears localStorage, sets an in-flight logout flag `(window as any).__isLoggingOut`, and redirects directly to the public home page (`/`) from any view.
- **`api.ts` (`src/lib/api.ts`):**
  - Centralized HTTP fetch wrapper around `apiClient<T>()`.
  - Normalizes base URL (`process.env.NEXT_PUBLIC_API_URL` -> Render backend).
  - Automatically attaches `Authorization: Bearer <token>`.
  - Configures **45-second timeout** (`timeoutMs = 45000`) and **automatic retry** to smoothly handle Render free-tier cold-start wake-up delays without failing client requests.
  - Automatically clears invalid tokens and redirects on unexpected 401s while avoiding loops on login/register/home pages.

---

## 5. Backend Architecture & Request Lifecycle

### 1. Server Initialization (`src/server.ts`)
1. Executes `dotenv.config()` and validates all required environment variables with Zod (`src/config/env.ts`).
2. Configures DNS nameservers (`8.8.8.8`, `1.1.1.1`) to resolve MongoDB Atlas SRV connection strings reliably across all networks.
3. Initializes Express application (`createApp()`) and mounts onto native Node `http.createServer(app)`.
4. Initializes `SocketIOServer` with CORS and JWT handshake authentication.
5. Connects Mongoose to MongoDB Atlas with connection timeouts and socket keepalives.
6. Starts HTTP listener on `PORT` (`5000` locally, assigned by Render in production).
7. Listens for `SIGTERM` and `SIGINT` to execute graceful shutdown (closing HTTP connections and disconnecting MongoDB).

### 2. Standard Request Lifecycle
When a request arrives at the backend:
```
1. Request ID Middleware -> Injects unique X-Request-Id UUID header.
2. Helmet -> Strips dangerous headers, sets X-Frame-Options, XSS protection.
3. CORS Middleware -> Normalizes Origin, checks against allowed list & *.vercel.app.
4. Express Body Parser -> Parses JSON payloads with a strict 100kb limit.
5. Router -> Matches path (e.g. POST /api/v1/inquiries).
6. Rate Limiter -> Checks client IP threshold.
7. Auth Middleware (`authenticate`) -> Decodes JWT Bearer token; sets req.user.
8. Role Guard (`requireRole`) -> Verifies req.user.role matches allowed roles.
9. Validation Middleware (`validate(schema)`) -> Validates body/query using Zod.
10. Controller -> Extracts parameters, passes to Service layer.
11. Service Layer -> Executes business logic, interacts with Mongoose Models, AI, or Sockets.
12. Response Formatter (`sendSuccess` / `sendError`) -> Sends standardized JSON response envelope.
```

### 3. Standard Response Envelope
All API endpoints follow a consistent JSON structure:
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "INCOMPLETE_BRIEF",
      "message": "The intake brief is missing required specifications.",
      "details": [
        { "field": "brief", "message": "Tech stack not specified" }
      ]
    }
  }
  ```

---

## 6. Database Models & Schema Relationships

QuotePilot uses **MongoDB Atlas** with **Mongoose**. All collections enforce strict schemas, timestamps, and indexes:

```
                   +------------------------+
                   |          User          |
                   |------------------------|
                   | _id                    |
                   | name, email, role      |
                   | passwordHash (hidden)  |
                   | companyId (sparse, 1:1)|
                   +-----------+------------+
                               | 1:1 (for company_admin)
                               v
+------------------+ 1:N  +------------------------+
|     Service      |<-----+        Company         |
|------------------|      |------------------------|
| _id              |      | _id                    |
| companyId (FK)   |      | ownerUserId (FK, 1:1)  |
| title, category  |      | name, slug, status     |
| startingPrice    |      | portfolio [{title, img}]|
| checklist []     |      | ratingAverage, count   |
+--------+---------+      +-----------+------------+
         |                            |
         | 1:N                        | 1:N
         v                            v
+--------------------------------------------------+
|                     Inquiry                      |
|--------------------------------------------------|
| _id                                              |
| referenceNumber (INQ-YYYY-XXXX)                  |
| customerId (FK -> User)                          |
| companyId  (FK -> Company)                       |
| serviceId  (FK -> Service)                       |
| description, budget, deadline                    |
| aiValidation {rounds, missing [], overridden}    |
| aiSummary {status, summary, deliverables []}     |
| quotationId (FK -> Quotation, 1:1)               |
+-------------------+------------------------------+
                    |
          +---------+---------+
      1:1 |                   | 1:N
          v                   v
+-------------------+   +--------------------+
|     Quotation     |   |      Message       |
|-------------------|   |--------------------|
| _id               |   | _id                |
| inquiryId (FK)    |   | inquiryId (FK)     |
| referenceNumber   |   | senderId (FK)      |
| totalAmount       |   | senderRole         |
| milestones [      |   | text               |
|   {title, amount, |   | createdAt          |
|    days, status}  |   +--------------------+
| ]                 |
| versionHistory [] |
+---------+---------+
          | (When accepted)
          v 1:1
+-------------------+
|      Review       |
|-------------------|
| _id               |
| companyId (FK)    |
| customerId (FK)   |
| inquiryId (FK, 1:1|
| rating (1-5)      |
| comment           |
+-------------------+
```

---

## 7. Complete Project Workflows & Scenarios

### Workflow 1: Client Service Inquiry with AI Gatekeeper
1. **Discovery:** Client visits `/companies` or searches by category on `/`. Client views Pixel & Pine Studio profile at `/companies/pixel-and-pine-studio`.
2. **Intake Form:** Client clicks "Request Quote" on "Full-Stack Web Development" service, navigating to `/inquire?serviceId=...`.
3. **AI Gatekeeper Audit:**
   - Client enters a vague brief: *"I want a website built fast."*
   - Client clicks "Submit Intake & Request Quotation" (or clicks "Audit Brief with AI Gatekeeper").
   - The frontend triggers an automated pre-flight audit via `POST /api/v1/inquiries/validate-brief`.
   - **Backend execution (`GeminiService.validateBrief`):**
     - Runs algorithmic heuristic checks (`isMeaninglessText`): Rejects keyboard mashing (e.g., `asdfghjkl`) or text with <12% vowels.
     - Calls Google Gemini 2.5 Flash with the service's checklist:
       1. Technical specifications & preferred tech stack.
       2. Target launch deadline or timeline.
       3. Number of custom pages / key integrations.
     - Gemini returns structured JSON: `isComplete: false`, `missing: ["Tech stack not mentioned", "No deadline provided", "Page count unclear"]`.
   - **Form Feedback:** Submission is blocked. The intake form renders an alert box itemizing exactly what details must be added.
4. **Resolution & Submission:**
   - Client updates brief: *"We need a 5-page React/Node.js e-commerce application integrated with Stripe and ImageKit, needed by August 15."*
   - Client submits. AI Gatekeeper returns `isComplete: true`.
   - Backend saves new `Inquiry` document (status: `new`, reference: `INQ-2026-0001`).
   - Sockets emit event to company workspace.

### Workflow 2: Bilateral Negotiation & Milestone Slip Covenant
1. **Company Desk Triage:** Company admin navigates to `/company/inquiries` and opens `INQ-2026-0001`.
2. **AI Summary:** The company view automatically renders Gemini's generated structured brief summary (executive summary, extracted budget, deliverables checklist, suggested next steps).
3. **Real-time Discussion:** Client and Company exchange messages inside the inquiry docket via Socket.io rooms.
4. **Quotation Generation (BR-09 strictly enforced: AI NEVER sets prices):**
   - Company admin clicks "Create Quotation Slip" (`/company/inquiries/[id]/quote`).
   - Admin defines milestones:
     - Milestone 1: UI/UX Architecture & Database Schema — PKR 60,000 (10 days).
     - Milestone 2: Core Express API & Authentication — PKR 90,000 (14 days).
     - Milestone 3: Frontend Integration & Deployment — PKR 100,000 (16 days).
     - Total: PKR 250,000.
   - Admin clicks "Send Formal Quotation Slip".
   - Backend sets Quotation status to `sent` and Inquiry status to `quoted`.

### Workflow 3: Covenant Acceptance & Escrow Sign-Off
1. **Client Review:** Client opens the inquiry docket and clicks "View Quotation Slip". A modal displays the itemized milestone slip with terms and SECP covenant badges.
2. **Acceptance:** Client clicks "Accept Quotation Covenant".
3. **Status Machine:**
   - Quotation status becomes `accepted`.
   - Inquiry status becomes `in_progress`.
   - Meezan Escrow covenant simulation is locked.
4. **Delivery & Review (BR-14):**
   - After project milestones are fulfilled, Client unlocks the "Submit Commercial Review" modal.
   - Client submits a 5-star rating with review comments.
   - Backend creates `Review` document and atomically recalculates the company's `ratingAverage` and `ratingCount`.

---

## 8. Deployment & Production Realities

### Frontend: Vercel (`https://quotepilot-green.vercel.app`)
- Hosted on Vercel's global edge network.
- Environment variables:
  - `NEXT_PUBLIC_API_URL`: Points to Render backend (`https://quotepilot-backend.onrender.com/api/v1`).
  - `NEXT_PUBLIC_SOCKET_URL`: Points to Render backend socket origin (`https://quotepilot-backend.onrender.com`).
  - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`: ImageKit CDN client key.
  - `NEXT_PUBLIC_URL_ENDPOINT`: ImageKit CDN endpoint.

### Backend: Render (`https://quotepilot-backend.onrender.com`)
- Deployed on Render's Web Service running Node.js.
- **Handling Free-Tier Cold Starts:**
  - Render spins down inactive containers after ~15 minutes of inactivity. Initial boot takes 15–20 seconds.
  - **Client-Side Timeout:** Configured to `45000ms` with automatic retry in `frontend/src/lib/api.ts`.
  - **User Experience (Loaders):** Prominent animated loader banners and rotating spinners inform users that the cloud server is waking up, completely eliminating blank screens or confusion.
- **Universal CORS:** Backend dynamically matches all `*.vercel.app` domains, allowing preview branches and production deployments to communicate seamlessly without origin rejections.

---

## 9. Interview Presentation Guide

### 30-Second Elevator Pitch
> *"QuotePilot is a full-stack commercial services marketplace and quotation management platform built with Next.js, Express, MongoDB Atlas, and Google Gemini AI. It replaces unstructured client-freelancer agreements with institutional-grade bilateral covenants. Key features include an AI Gatekeeper that audits client project briefs against agency checklists before submission, version-controlled milestone quotation slips, and room-based WebSockets for secure real-time negotiation."*

### 2-Minute Technical Explanation
> *"On the frontend, I used Next.js 15 with the App Router, React 19, and Tailwind CSS. The user interface features Framer Motion parallax multi-plane scrolling on the landing page and specialized dashboards for customers, company admins, and platform moderators.
>
> On the backend, I built a modular Express.js application with TypeScript using a clean route-controller-service pattern. Data is modeled in MongoDB Atlas via Mongoose, with strict tenant isolation so companies can never access foreign inquiry dockets.
>
> A key architectural highlight is our AI Gatekeeper using Google Gemini 2.5 Flash: when a customer submits an inquiry, Gemini analyzes their brief against the service's requirement checklist to detect missing specifications or keyboard mashing, blocking incomplete requests while allowing an override after two rounds. For communication, I implemented Socket.io with JWT handshake verification for room-based negotiation.
>
> The frontend is deployed on Vercel and the backend is deployed on Render. Because Render's free tier spins down on idle, I built custom cold-start mitigation into our API client—including 45-second abort handling, auto-retry, and prominent animated wake-up banners—ensuring a smooth user experience."*

### Key Architectural Decisions & Trade-offs
1. **Separate Express Backend vs. Next.js API Routes:**
   - *Decision:* Kept all business logic, database queries, and WebSocket servers inside a standalone Express.js backend rather than Next.js server actions.
   - *Reason:* QuotePilot requires persistent WebSockets (`Socket.io`) for bilateral chat, complex middleware pipelines (Helmet, CORS, rate limiting), and platform modularity. Serverless routes on Vercel cannot maintain persistent WebSocket connections.
2. **Tailwind CSS Only (No Component Libraries like shadcn/ui or MUI):**
   - *Decision:* Built all buttons, badges, modals, cards, inputs, and loaders purely with Tailwind utility classes.
   - *Reason:* Ensures lightweight bundles, zero dependency bloat, complete control over design tokens, and exact visual alignment with Google Stitch design references.
3. **Algorithmic Heuristics + LLM Gatekeeper:**
   - *Decision:* Pre-filtered briefs with Regex vowel-ratio analysis before calling Gemini API.
   - *Reason:* Reduces unnecessary LLM API costs and latency by catching gibberish locally before invoking external cloud models.

---

## 10. Key Files Map

| Path | Architectural Purpose | Why It Matters |
| :--- | :--- | :--- |
| `backend/src/server.ts` | Server Entry Point | Wires Express, HTTP, Socket.io, JWT socket handshake, and MongoDB connection. |
| `backend/src/app.ts` | Express App Configuration | Configures Helmet, universal Vercel CORS, body parser, and mounts all API routes. |
| `backend/src/modules/ai/gemini.service.ts` | AI Integration Service | Executes AI Gatekeeper brief validation, gibberish filtering, and inquiry brief summarization. |
| `backend/src/models/Inquiry.ts` | Inquiry & AI State Model | Stores customer briefs, AI validation rounds, Gemini summaries, and milestone references. |
| `backend/src/models/Quotation.ts` | Quotation Covenant Model | Manages itemized milestones, status state machine, and version histories. |
| `backend/src/middleware/auth.ts` | Authentication Middleware | Verifies JWT tokens, extracts authenticated user, and injects into `req.user`. |
| `frontend/src/lib/api.ts` | Central API Client | Custom fetch wrapper with 45s timeout, auto-retry on cold starts, and token attachment. |
| `frontend/src/context/AuthContext.tsx` | Global Auth State | Manages login state, roles, token persistence, and clean logout routing. |
| `frontend/src/app/page.tsx` | Marketplace Homepage | Parallax hero transforms, discipline grid, featured approved studios, and live loaders. |
| `frontend/src/app/companies/page.tsx` | Companies Directory | Filterable registry with animated loading states, search, and dynamic firm counters. |
| `frontend/src/app/inquire/page.tsx` | Intake Brief Form | Client inquiry submission with interactive AI Gatekeeper audit and round limiter. |
| `frontend/src/components/layout/Navbar.tsx` | Responsive Navigation | Universal navigation header with role-aware tabs, mobile drawer, and logout trigger. |
