# ANTIGRAVITY_PROMPTS — ScopeSentry

Path: `docs/ANTIGRAVITY_PROMPTS.md`
These are prompts YOU paste into Antigravity. They are not instructions that live in the repo for the agent to follow on its own.

---

## 1. Setup prompt (run once)

```
You are starting the ScopeSentry project. Run /gsd:new-project, but do NOT interview me from scratch. The project files already exist and are the source of truth:

- docs/MASTER_PROMPT.md = requirements (features, roles, permissions, business rules, out of scope)
- docs/PHASES.md = roadmap (use these phases as the roadmap; do not invent your own)
- docs/ARCHITECTURE.md = conventions (all "suggested" items; ask before deviating)
- AGENTS.md = how you must work. You must NOT overwrite or rewrite AGENTS.md.
- design/ = UI reference. docs/design-tokens.md is a placeholder you will fill in Phase 0.
- REVIEW_CHECKLIST.md = for me, the owner. Do not edit it.

Read all of them fully before doing anything.

Environment rules (mandatory):
- My real env files already exist with real working values: server/env (backend) and frontend/env (frontend; you may create it with non-secret values only).
- USE them for everything that needs configuration (running the app, seed, indexing, builds, tests using the test database variable only). Do not ask me for keys.
- You may edit them to add new variable lines or change non-secret configuration.
- NEVER print, log, copy, summarize, echo or commit their values anywhere, including summaries, error output, test output and commit messages.
- If a variable is missing, ask me for the variable NAME only. I will add the value myself.
- The files are named "env", not ".env". Check current dotenv docs and current Vite docs for how they are loaded. If frontend/env cannot be loaded by Vite, tell me and propose frontend/.env. Do not decide silently.
- Only server/env.example and frontend/env.example are committed. Make sure .gitignore excludes server/env, frontend/env and .env*.
- Tests must use the separate test database and must mock Gemini, ImageKit and email.

Rules:
- Do not add features, roles, modules or libraries outside the spec. Ask me first.
- One phase at a time. Stop for my review after each phase.
- Never claim anything works or tests passed without running it and showing real output.

When you are done reading, do NOT start building. Reply with:
1. A description, in your own words, of the roles and permissions.
2. The Phase 0 scope.
3. The design you found in /design (screens found, screens missing).
4. The list of files you read.
5. Any contradictions or open questions you found between the files (including open decisions D-1 and D-2 in MASTER_PROMPT section 16).
Then run the GSD roadmap step based on docs/PHASES.md, show me the roadmap, and STOP. Wait for my instruction.
```

---

## 2. Phase prompt (reusable — replace N)

```
Start Phase N from docs/PHASES.md.

Follow AGENTS.md. Use docs/MASTER_PROMPT.md for rules, docs/ARCHITECTURE.md for conventions, design/ and docs/design-tokens.md for UI.

1. DISCUSS: Ask me only about items that are genuinely unclear or need an owner decision. If everything is clear, say so and continue.
2. PLAN: Check the CURRENT official docs for any fast-changing library you will use and name the doc page or version. Show a short plan: files to create/change, routes, tests, and which business rule ids (BR-xx) are covered. If this phase is split (a)/(b), do only part (a) first.
3. EXECUTE: Implement only what this phase lists. Use small atomic commits. Never write, print or commit secret values. Use server/env and frontend/env as described in AGENTS.md.
4. VERIFY: Run type-check, lint, the tests for this phase's business rules, and npm audit. Paste the REAL output. If something fails, fix it or tell me honestly. Never say tests passed without running them.
5. SUMMARY: What was built, decisions made, doc pages/versions used, how to run it, and "Suggestions" (things you noticed but did NOT build).
Then STOP. Do not start the next phase or part (b) until I say "approved".
```

---

## 3. Confirm GSD command names

Run `/gsd:help` and confirm the exact names of these before you rely on them (command names can differ between GSD versions):

- project initialization (assumed `/gsd:new-project`)
- roadmap creation/viewing
- discuss a phase
- plan a phase
- execute a phase
- verify a phase
- progress/status
- help

If a name differs, edit the prompts above to match. Do not let the agent guess.

---

## 4. File placement tree

```
scopesentry/
├── AGENTS.md                      ← from this delivery
├── REVIEW_CHECKLIST.md            ← from this delivery (owner only)
├── .gitignore                     ← agent creates in Phase 0 (must exclude env files)
├── design/                        ← YOU place your design export here (Google Stitch etc.)
├── docs/
│   ├── MASTER_PROMPT.md           ← from this delivery
│   ├── ARCHITECTURE.md            ← from this delivery
│   ├── PHASES.md                  ← from this delivery
│   ├── design-tokens.md           ← placeholder; agent fills in Phase 0
│   └── ANTIGRAVITY_PROMPTS.md     ← this file
├── frontend/
│   ├── env                        ← agent may create (VITE_API_BASE_URL only); never committed
│   └── env.example                ← agent creates; committed
└── server/
    ├── env                        ← YOU already have it; real values; never committed
    └── env.example                ← agent creates; committed
```

---

## 5. Before-you-start checklist

- [ ] The repo folder exists and is a git repository.
- [ ] Files from this delivery are in the exact paths above.
- [ ] Your design export is saved in `design/`.
- [ ] `server/env` exists with real working values for the NAMES in MASTER_PROMPT section 4 (MongoDB, test database URI, JWT/CSRF secrets, ImageKit, Gemini, limits). Email variables only when you decide D-1.
- [ ] A separate MongoDB test database exists (for example an Atlas branch/second database) and `MONGODB_TEST_URI` points to it.
- [ ] Your Atlas cluster is a replica set (Atlas default) so transactions work.
- [ ] You know your Gemini model names are available to your key (the agent will verify against current docs).
- [ ] `.gitignore` will exclude env files before the first commit. If a secret was ever committed, rotate it.
- [ ] Rotate any secret you ever pasted into a chat.
- [ ] Decide D-1 (email provider for password recovery) before Phase 2b.
- [ ] Paste the setup prompt (section 1) once, review the roadmap, then use the phase prompt (section 2) starting at Phase 0.
