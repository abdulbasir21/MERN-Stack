# ANTIGRAVITY_PROMPTS — for the owner (you). Not read by the agent.

## 1. Setup prompt (run once)

Paste this into Antigravity:

```
Run /gsd:new-project for InterviewPilot. Do NOT interview me from scratch: use my files as the source of truth.

Source of truth:
- docs/MASTER_PROMPT.md = requirements (wins on features and permissions)
- docs/PHASES.md = roadmap (use these phases in this order; do not add, remove or merge phases)
- docs/ARCHITECTURE.md = conventions (all suggestions; ask before deviating)
- AGENTS.md = how you must work. Do NOT overwrite or rewrite it.
- /design = UI reference (wins on visuals). Follow it for every screen it contains; design any missing screen in the SAME style. docs/design-tokens.md is a placeholder you fill in during Phase 0.
- REVIEW_CHECKLIST.md and docs/ANTIGRAVITY_PROMPTS.md are for me; do not act on them.

Environment rules (very important):
- My real .env files already exist with real working values: server/.env (backend) and client/.env (frontend). Confirm these exact paths by listing the project root. If a folder is named differently, tell me the real name.
- USE these files for everything that needs configuration: running the app, migrations, seed, tests. Do NOT ask me for keys.
- NEVER print, log, echo, copy, summarize or commit the VALUES. This includes terminal output, summaries, commit messages and code comments. Never run cat/type/echo on .env files. To list what exists, show variable NAMES only, for example: grep -oE '^[A-Za-z_][A-Za-z0-9_]*' server/.env
- If a variable is missing, ask me for the variable NAME only; I will add it myself.
- Only .env.example files (names and placeholders) are committed. .env is in .gitignore.
- Tests use a separate test database (TEST_DATABASE_URL) and mock Gemini and ImageKit. Never touch my real database, Gemini quota or ImageKit account in automated tests. Live smoke tests with the real Gemini key only when I approve each run.

Models: the free-tier rule applies. Use the cheapest free-tier Gemini text, TTS and embedding models, chosen from current official docs. Show me the shortlist (with doc page and date checked) and wait for my approval before first use. Never fall back to a paid model.

Then, before writing any code, describe back to me in your own words:
1. The roles (USER, ADMIN, demo visitor) and what each can do.
2. The scope of Phase 0 only.
3. The design: which screens exist in /design and which are missing.
4. Which files you read.
5. Any questions, including the open decisions D-1 to D-7 that are relevant now.

Then STOP and show me the roadmap. Do not start Phase 0 until I say so.
```

## 2. Phase prompt (reusable; replace N)

Paste this each time, changing N:

```
Work on Phase N from docs/PHASES.md only. Follow AGENTS.md and docs/MASTER_PROMPT.md. Use my existing server/.env and client/.env; never print or commit their values.

1. DISCUSS: ask me only about items that are genuinely unclear or are open decisions (D-1 to D-7) that belong to this phase. Do not ask about anything already decided in the files.
2. PLAN: list the files you will create or change and the tests you will write (by rule ID). Check the current official docs for any library involved and name the page and version. If this phase is marked ★, plan part (a) first.
3. EXECUTE: build only what Phase N lists. Make small atomic commits. Do not add features, libraries or tables that are not in the spec. If this phase is marked ★, do part (a) (pure functions + tests), show the results, and STOP for my review before part (b).
4. VERIFY: run type-check, lint and tests and show the REAL output. Do not say tests pass unless you ran them and saw them pass. Check git status for secrets before committing.
5. SUMMARY: what you built, files created or changed, tests run (with counts), what is incomplete, how I run and verify it, and any questions.

Then STOP. Do not start the next phase until I say "approved".
```

## 3. GSD commands note

I only know these two command names from your instructions: `/gsd:new-project` and `/gsd:help`. Before the first phase, run **`/gsd:help`** and confirm the exact command names for discussing, planning, executing and verifying a phase. If they differ from the words used in the phase prompt (DISCUSS, PLAN, EXECUTE, VERIFY), put the real command names into the phase prompt above, or keep the plain words and let the agent map them.

## 4. File placement tree

```
interviewpilot/                    (your repo root)
  AGENTS.md                        <- root, agent rules
  REVIEW_CHECKLIST.md              <- root, for you
  .gitignore                       <- must list .env files
  design/                          <- put your Google Stitch design exports here
  docs/
    MASTER_PROMPT.md
    ARCHITECTURE.md
    PHASES.md
    design-tokens.md               <- placeholder; agent fills in Phase 0
    ANTIGRAVITY_PROMPTS.md         <- this file, for you
  server/
    .env                           <- already exists (real values)
  client/
    .env                           <- already exists (real values)
```

Everything else (code, `shared/`, `.env.example` files, tests) is created by the agent in its phases.

## 5. Before-you-start checklist

- [ ] The five files are placed exactly as in the tree above.
- [ ] `/design` contains your Stitch design exports (screens as images or exported code).
- [ ] `server/.env` and `client/.env` exist and the variable names roughly match MASTER_PROMPT section 4 (the agent will adapt to your existing names).
- [ ] `.gitignore` already lists `.env`, `server/.env` and `client/.env`.
- [ ] Neon project `interviewpilot` created; you have a separate test database or branch and its URL is in `server/.env` as `TEST_DATABASE_URL`.
- [ ] You have a direct (non-pooled) Neon connection string saved as `DIRECT_URL`.
- [ ] Gemini API key is from a free-tier project; you know your provider limits from Google's docs (the agent will ask you to enter them in settings).
- [ ] ImageKit account is ready; keys are in `server/.env`.
- [ ] You decided or will decide the open items: D-1 email provider, D-7 folder names (others are asked at their phase).
- [ ] **Rotate any secret you have ever pasted into a chat** and update it in `server/.env`.
- [ ] You will read each summary and run each "done when" check before saying "approved".
