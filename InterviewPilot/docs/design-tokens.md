# Design tokens — InterviewPilot

**Status: ACTIVE (Extracted in Phase 0 from `/design` — Google Stitch "Executive Synthetic" theme).**
Every screen reuses these tokens. If a value here disagrees with `/design`, `/design` wins.

## Design rule

A design exists in `/design` (made with Google Stitch). Follow it for every screen it contains. Any needed screen missing from it must be designed in the SAME style (same colors, typography, spacing, components). Do not build features that appear in the design but not in the spec. Write `docs/design-tokens.md` from the design and reuse it everywhere.

## Aesthetic Direction ("Executive Synthetic")

An executive-grade, hyper-focused dark minimalist aesthetic tailored for high-stakes interview preparation. It merges the gravitas of a private corporate coaching suite with the subtle kinetic feedback of an intelligent AI copilot:
- **Deep Immersion**: Inky obsidian-level canvases (`#0B0F17` / `#0F131C`) so avatar feeds, metrics, and transcription streams command attention without chrome competition.
- **Controlled Luminescence**: Electric blue (`#3B82F6`), cyan (`#06B6D4`), and deep indigo (`#6366F1`) strictly communicate primary actions, live microphone/speech telemetry, and AI scoring computation.
- **Architectural Rigor**: Crisp `1px` hairline borders (`#1E293B` subtle, `#334155` active) and translucent glassmorphic floating controls (`rgba(17, 24, 39, 0.75)` with `backdrop-filter: blur(16px)`).

## Tokens Reference

| Group | Token | Value (from `/design/DESIGN.md` & `/design/tokens.json`) | CSS Variable / Tailwind Mapping |
|---|---|---|---|
| **Color — Canvas & Surfaces** | `background` / `canvas-base` | `#0B0F17` ( stitch M3 surface `#0F131C`, lowest `#0A0E16` ) | `bg-[#0B0F17]` / `--background` |
| **Color — Canvas & Surfaces** | `surface` (Elevation 1) | `#111827` ( stitch container `#181C24` / `#1C2028` ) | `bg-[#111827]` / `--surface` |
| **Color — Canvas & Surfaces** | `surface-raised` (Elevation 2) | `#1E293B` ( stitch container-high `#262A33` / `#31353E` ) | `bg-[#1E293B]` / `--surface-raised` |
| **Color — Canvas & Surfaces** | `surface-glass` | `rgba(17, 24, 39, 0.75)` + `backdrop-filter: blur(16px)` | `bg-[#111827]/75 backdrop-blur-md` |
| **Color — Borders** | `border` (Hairline Subtle) | `#1E293B` | `border-[#1E293B]` / `--border` |
| **Color — Borders** | `border-strong` (Highlight Active) | `#334155` (hover `#64748B`, outline-variant `#424754`) | `border-[#334155]` / `--border-strong` |
| **Color — Text** | `text-primary` | `#F8FAFC` (stitch `on-surface` `#DFE2EE`) | `text-[#F8FAFC]` / `--text-primary` |
| **Color — Text** | `text-secondary` | `#94A3B8` (stitch `on-surface-variant` `#C2C6D6`) | `text-[#94A3B8]` / `--text-secondary` |
| **Color — Text** | `text-muted` | `#64748B` (stitch `outline` `#8C909F`) | `text-[#64748B]` / `--text-muted` |
| **Color — Accents** | `accent-blue` (Primary) | `#3B82F6` (hover `#2563EB`, container `#4D8EFF`, light `#ADC6FF`) | `bg-[#3B82F6]` / `text-[#3B82F6]` |
| **Color — Accents** | `accent-cyan` (Secondary / Telemetry) | `#06B6D4` (light `#4CD7F6`, container `#03B5D3`) | `bg-[#06B6D4]` / `text-[#06B6D4]` |
| **Color — Accents** | `accent-purple` (Tertiary / AI Engine) | `#6366F1` (light `#C0C1FF`, container `#8083FF`) | `bg-[#6366F1]` / `text-[#6366F1]` |
| **Color — Semantic** | `success` | `#10B981` (emerald-500, subtle fill `rgba(16, 185, 129, 0.12)`) | `text-emerald-400` / `--success` |
| **Color — Semantic** | `warning` | `#F59E0B` (amber-500, subtle fill `rgba(245, 158, 11, 0.12)`) | `text-amber-400` / `--warning` |
| **Color — Semantic** | `danger` / `error` | `#EF4444` (stitch error `#FFB4AB`, container `#93000A`) | `text-rose-400` / `bg-rose-600` |
| **Gradient** | `primary` | `linear-gradient(135deg, #38BDF8 0%, #3B82F6 50%, #6366F1 100%)` | Logo & primary AI accent |
| **Gradient** | `subtle` (Card Top Border / Critique) | `linear-gradient(90deg, #3B82F6 0%, rgba(59, 130, 246, 0) 100%)` | AI critique card top rule |
| **Gradient** | `waveform` | `linear-gradient(180deg, #3B82F6 0%, #06B6D4 100%)` | Live audio waveform bars |
| **Typography** | `font-family` | `Inter, -apple-system, BlinkMacSystemFont, sans-serif` (all roles); `JetBrains Mono, monospace` for technical/IDs; `tabular-nums` for all timers/metrics | `font-sans`, `tabular-nums` |
| **Typography — Sizes** | `xs` (`label-caps` / `body-sm`) | `11px` (`0.6875rem`, uppercase, tracking `0.06em`) / `12px` (`0.75rem`, line-height `18px`) | `text-xs` |
| **Typography — Sizes** | `sm` (`body-md` / `label-lg`) | `14px` (`0.875rem`, line-height `20px`–`22px`) | `text-sm` |
| **Typography — Sizes** | `base` (`body-lg` / `title-md`) | `16px` (`1rem`, line-height `24px`–`26px`) | `text-base` |
| **Typography — Sizes** | `lg` (`headline-sm`) | `20px` (`1.25rem`, line-height `28px`, tracking `-0.005em`, weight `600`) | `text-xl font-semibold` |
| **Typography — Sizes** | `xl` (`headline-md`) | `24px` (`1.5rem`, line-height `32px`, tracking `-0.01em`, weight `600`) | `text-2xl font-semibold` |
| **Typography — Sizes** | `2xl` (`headline-lg`) | `32px` (`2rem`, line-height `40px`, tracking `-0.015em`, weight `600`) | `text-3xl font-semibold` |
| **Typography — Sizes** | `3xl` / `4xl` (`headline-xl`) | `48px` (`3rem`, line-height `56px`, tracking `-0.02em`, weight `700`) | `text-5xl font-bold` |
| **Typography — Weights** | Regular, Medium, Semibold, Bold | `400`, `500`, `600`, `700` | `font-normal`, `font-medium`, `font-semibold`, `font-bold` |
| **Spacing** | Scale | `4px` (`0.25rem`), `8px` (`0.5rem`), `12px` (`0.75rem`), `16px` (`1rem`, `space-md`/`gutter-sm`), `24px` (`1.5rem`, `space-lg`/`gutter`), `32px` (`2rem`, `margin`), `40px` (`2.5rem`, `space-xl`), `48px` (`3rem`), `64px` (`4rem`) | Standard Tailwind spacing scale |
| **Radius** | `sm`, `md`, `lg`, `xl`, `full` | `sm`: `4px` (`0.25rem`), `DEFAULT`: `8px` (`0.5rem`), `md`: `12px` (`0.75rem`, buttons/inputs), `lg`: `16px` (`1rem`, cards/camera bezels), `xl`: `24px` (`1.5rem`), `full`: `9999px` (status chips, mic docks) | `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` |
| **Shadow & Elevation** | `sm` (Level 1 Panel) | `0 0 0 1px #1E293B` on `#111827` | `border border-[#1E293B]` |
| **Shadow & Elevation** | `md` (Input Focus / Primary CTA Glow) | Focus: `0 0 0 1px #3B82F6, 0 0 12px rgba(59, 130, 246, 0.25)` · CTA Hover: `0 0 16px rgba(59, 130, 246, 0.4)` · Active AI Glow: `0 0 24px -4px rgba(6, 182, 212, 0.25)` | Custom shadow utilities |
| **Shadow & Elevation** | `lg` (Level 3 Modal / Float Bar) | `0 20px 40px -15px rgba(2, 6, 23, 0.8), 0 0 0 1px rgba(51, 65, 85, 0.5)` | `shadow-2xl` |
| **Motion** | Durations & Easing (Phase 15 only) | Fast: `150ms cubic-bezier(0.4, 0, 0.2, 1)`, Standard: `250ms cubic-bezier(0.16, 1, 0.3, 1)`. Reduced motion (`prefers-reduced-motion: reduce`) disables transforms. | Phase 15 Framer Motion & CSS transitions |
| **Layout** | Containers & Proportions | Max page width: `1280px` (`12` columns, `24px` gutter, `32px` outer margin; Tablet `8` cols `16px` gutter; Mobile `4` cols). App sidebar width: `256px` (`16rem`). Live Interview Room: fixed-viewport HUD (`16px` gutter), split into Left AI Recruiter Panel (`55%`–`60%` desktop) + Right Candidate Telemetry & Controls Panel (`40%`–`45%` desktop). | Responsive CSS Grid / Flex |

## Components Specification

- **Buttons**:
  - **Primary**: Solid `#3B82F6`, white text (`#F8FAFC`), radius `12px`, hover `#2563EB` with `0 0 16px rgba(59, 130, 246, 0.4)`.
  - **Secondary**: `#1E293B` fill, `1px solid #334155`, `#F8FAFC` text, hover border `#64748B`, radius `12px`.
  - **Ghost**: Transparent background, `#94A3B8` text, hover `#1E293B` surface and `#F8FAFC` text.
  - **Destructive / End Interview**: Deep rose surface (`#93000A` / `#E11D48`), white text, crimson glow on hover.
- **Inputs & Selects**:
  - Surface `#111827`, border `1px solid #1E293B`, radius `10px`, text `#F8FAFC`, placeholder `#64748B`.
  - Focus ring: `0 0 0 1px #3B82F6, 0 0 12px rgba(59, 130, 246, 0.25)`.
- **Cards & Analytical Panels**:
  - Background `#111827`, border `1px solid #1E293B`, radius `16px` (`1rem`).
  - Actionable AI critique cards feature a `1px` top border gradient fading from `#3B82F6` on the left to transparent on the right.
- **Tables**:
  - Surface `#111827`, header row `#0B0F17` with `11px` uppercase `label-caps` (`#94A3B8`), `1px solid #1E293B` row dividers, hover row `#1E293B/50`, `tabular-nums` for numeric cells.
- **Badges & Runtime State Labels (`speaking` / `thinking` / `listening`)**:
  - Compact pill (`height: 28px`, `px: 12px`, `rounded-full`, `label-caps`).
  - **Speaking (`RECRUITER_SPEAKING`)**: Electric blue indicator (`#3B82F6`) on `#1E293B`.
  - **Thinking (`PROCESSING_ANSWER`, `AI_THINKING`, `GENERATING_NEXT_QUESTION`)**: Deep indigo indicator (`#6366F1`) on `#1E293B`.
  - **Listening (`CANDIDATE_LISTENING`)**: Cyan indicator (`#06B6D4`) on frosted navy backing.
  - **Waiting (`WAITING_FOR_CANDIDATE`)**: Neutral slate badge (`#334155` border, `#94A3B8` text).
- **Tabs & Dialogs**:
  - Tabs: `#111827` pill track with `#1E293B` active segment and `#3B82F6` bottom/border indicator.
  - Dialogs (e.g., confirm "End Interview"): Level 3 surface (`#1E293B`), `1px solid rgba(51, 65, 85, 0.5)`, backdrop blur overlay.
- **Toasts, Progress Bars & Charts**:
  - Progress bars: `#1E293B` track (`h-2 rounded-full`), gradient fill (`#3B82F6` to `#06B6D4`).
  - Charts (trend, skill breakdown): SVG/CSS bar & line visualizations using `#3B82F6` (primary), `#06B6D4` (comparison/secondary), `#6366F1` (tertiary), `#1E293B` gridlines.
- **Waveform & Avatar Frame**:
  - **Avatar Frame**: `16px` rounded container (`#0B0F17` base, `1px solid rgba(255, 255, 255, 0.05)` inner inset border) housing the `@interviewflowai/talking-avatar` canvas and caption overlay.
  - **Waveform**: Live `AnalyserNode` RMS visualizer with `#3B82F6` → `#06B6D4` vertical bars; strictly flat when RMS `< SILENCE_THRESHOLD (0.01)`, muted, or not listening (no fake idle animation).
- **Empty States, Skeletons, Error States & Banners**:
  - **Skeletons**: `#1E293B` blocks on `#111827` cards.
  - **Quota-Exceeded / Budget-Exhausted Banner**: Amber/rose bordered panel (`#1E293B`) displaying: `"AI limit reached. Your dashboard and history are still available."`
  - **"Sample data" Banner**: Prominent cyan/indigo pill banner on all demo fixture views (`"Sample data — read-only demo preview"`).

## Screens Coverage Matrix

### Covered directly in `/design/screens/`
1. **Candidate Dashboard** (`design/screens/candidate-dashboard.html`)
2. **Interview Setup & Customization** (`design/screens/interview-setup.html`)
3. **Live Interview Room** (`design/screens/live-interview-room.html`) — adapted strictly to spec rules (no webcam, "Ask a Question" button per ROOM-2/ROOM-3)
4. **Comprehensive Interview Report** (`design/screens/comprehensive-report.html`)

### Missing from `/design/screens/` (Designed in the exact same "Executive Synthetic" style)
1. **Public Landing Page** (`PUB-1`: Hero, How It Works, Features, Room Preview, Supported Types, Benefits, FAQ, Footer)
2. **Privacy & Data Retention Page** (`PUB-2`)
3. **Authentication Pages** (`PUB-3`: Login, Register, Forgot Password, Reset Password)
4. **Onboarding Page** (`USR-1`: Skippable profile setup)
5. **Documents Management UI** (`DOC-1` to `DOC-9`: CV/JD upload & pasted JD, status badges, preview/delete)
6. **Device Check Page** (`ROOM-2` / `MASTER_PROMPT` §11: Mic permission, live input level test, audio output test, avatar preview, "no webcam needed" notice)
7. **Interview History & Progress Comparison Page** (`RPT-6`, `RPT-7`: Paginated list, search/filters, trend chart, 2-interview skill comparison)
8. **Profile & Settings / Privacy Controls Page** (`USR-2` to `USR-4`: Profile update, password change, delete interview/document/account)
9. **Demo Dashboard** (`DEM-1` to `DEM-7`: Sample data banner, sample history/reports, start limited live demo interview)
10. **Admin Dashboard Suite** (`ADM-1` to `ADM-10`: Overview, Users, Documents, Interviews, AI Usage, Quota/Budget/Emergency Shutdown Settings, Demo Management, Audit Log)
