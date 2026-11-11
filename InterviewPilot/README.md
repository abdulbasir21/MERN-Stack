# InterviewPilot — Voice-First AI Executive Interview Preparation Platform

> **"Practice smarter. Interview with confidence."**

InterviewPilot is an end-to-end AI-powered job interview rehearsal platform designed for software engineers, product managers, and executive leaders. Built with strict enterprise security, fail-closed atomic quota reservations, dynamic LangGraph state adaptive questioning, real-time lip-synced 3D recruiter avatars, and zero audio storage.

---

## 🌟 Key Features

1. **Voice-First AI Recruiter Rehearsal Room**:
   - Interactive 3D avatar powered by Talking Avatar SDK (`@interviewflowai/talking-avatar`).
   - Low-latency bidirectional speech processing using Gemini TTS & STT (`@google/genai`).
   - Real-time client-side RMS audio waveform visualizer.
   - **Zero Audio Storage**: Audio buffers are processed transiently in memory and immediately discarded.
2. **Adaptive Dynamic Questioning Engine**:
   - Multi-stage LangGraph state machine.
   - Dynamic difficulty transitions based on candidate performance.
   - In-memory rolling summary (≤ 1,200 chars) and strict prompt context capping (≤ 12,000 chars).
   - Real-time candidate inquiry ("Ask a Question") support.
3. **Factual RAG Document Grounding**:
   - Resume (CV) and Job Description (JD) parsing (PDF/DOCX up to 5 MB).
   - Semantic vector embeddings with pgvector HNSW indexing.
   - Strict database-enforced multi-tenant isolation (`userId` and `interviewId` partitioned).
4. **STAR Matrix Performance Scoring & Executive Reports**:
   - Granular rubric evaluation (Situation, Task, Action, Result) with anti-bias scoring prompt rules.
   - Executive scorecard, skill breakdown, strengths, focus areas, and study topic roadmaps.
   - Side-by-side historical performance comparisons and chronological trend analysis.
5. **Instant 1-Click Demo Experience**:
   - Isolated ephemeral demo sessions with zero signup friction.
   - Enforced rate limiting (1 interview/day, 5-minute cap, GENERAL mode only).
   - Automatic 24-hour purge of demo records; HMAC SHA-256 IP hashing.
6. **Enterprise Administration & Defense-in-Depth**:
   - Real-time platform overview with Decimal arithmetic global AI budget tracking.
   - Emergency AI Kill-Switch (`aiEnabled = false`) halting AI operations while keeping dashboard active.
   - Sensitive administrator actions (document download/deletion, transcript review) audited in atomic transactions (fail closed).

---

## 🏗 Monorepo Architecture

```
InterviewPilot/
├── client/              # Next.js 14 App Router, Tailwind CSS, Lucide icons
│   ├── app/             # (public), (auth), (app), admin routes
│   ├── components/      # UI primitives, RecruiterAvatar, Waveform
│   ├── hooks/           # useMicrophone, Web Audio API hooks
│   └── lib/             # Typed API client
├── server/              # Express.js TypeScript backend
│   ├── prisma/          # Prisma schema & pgvector migrations
│   ├── src/
│   │   ├── modules/     # auth, users, quota, documents, interviews, voice, admin, demo
│   │   ├── services/    # LangGraph engine, Gemini AI, RAG chunking, speech, storage
│   │   └── middleware/  # auth, permissions, rate limiting, csrf, errorHandler
│   └── tests/           # Vitest unit & API integration test suites
├── shared/              # Shared Zod schemas, TypeScript DTOs, pure mathematical utilities
├── design/              # Google Stitch UI design references
└── docs/                # Architecture, Master prompt, Phases, Deployment guide
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+
- **Database**: PostgreSQL 16+ with `vector` extension (Neon recommended)
- **API Keys**: Google Gemini API key, ImageKit credentials

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd InterviewPilot
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   - Configure `server/.env` based on `server/.env.example`.
   - Configure `client/.env` based on `client/.env.example`.
4. **Deploy Database Schema & Seed**:
   ```bash
   npm --workspace=@interviewpilot/server run prisma:deploy
   npm --workspace=@interviewpilot/server run prisma:seed
   ```
5. **Start Development Servers**:
   ```bash
   # In terminal 1: Start backend
   npm --workspace=@interviewpilot/server run dev

   # In terminal 2: Start frontend
   npm --workspace=@interviewpilot/client run dev
   ```

---

## 🧪 Testing & Verification

Run the comprehensive test suites across pure functions, API security matrices, and database transactions:

```bash
# Type check all workspaces
npm run type-check

# Run linter
npm run lint

# Run all test suites
npm run test
```

---

## 🔒 Security & Privacy Commitments

- **No Audio Saved**: Microphone audio is never stored or written to disk.
- **Fail-Closed Budgeting**: If quota or global budget reservations fail, no external AI calls are executed.
- **Zero-Information Exposure**: Server errors return opaque codes and request IDs without leaking SQL syntax or stack traces.
- **Role Isolation**: Normal candidates receive a `404 Not Found` when probing another candidate's interview or document, preventing identifier enumeration.

---

## 📄 License

Proprietary — All rights reserved. Built for InterviewPilot.
