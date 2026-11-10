# design-tokens — ScopeSentry

Path: `docs/design-tokens.md`
Derived directly from the owner's Google Stitch design export ("Blueprint Precision") in `design/`.

## 1. Source

- **Design folder:** `design/` (reference: Google Stitch export, `projects/5508587020154610825`).
- **Screens found in the design:**
  1. `01-homepage.html` — Full marketing homepage with hero, value proposition, live interactive demo preview, feature highlights, and pricing tiers.
  2. `02-dashboard-ai-detective.html` — AI Construction Change Detective main workspace: blueprint/spec diffing, change ledger, CSI MasterFormat tags, and cost delta breakdown.
  3. `03-login.html` — Executive 50/50 split authentication view with architectural skyscraper photography, frosted glass spec delta chips, and login form.
  4. `04-register.html` — Executive onboarding form with role selection (General Contractor, Subcontractor, Project Owner, Dispute Counsel).
  5. `05-forgot-password.html` — Password recovery and reset request form.
- **Screens needed by the spec but missing from the design (to be built in identical style):**
  - Projects List & New Project Modal/Form
  - Project Details with Documents & Investigations tabs
  - Document Upload modal with category selector and status badges
  - Start Investigation modal/flow and Findings Review detail drawer
  - Change Reports List & PDF Preview/Download page
  - Minimal Settings (name and password change)
- **Elements in the design that are NOT in the spec (not built, reported to owner):**
  - Public demo upload (out of scope per section 14; demo is read-only on seeded documents)
  - Paid subscription/billing tiers displayed on homepage (informational only; billing is out of scope)
  - Dark mode switcher on dashboard (the spec sets a clean light background with navy typography)

---

## 2. Colors

| Token | Hex Value | Use |
|---|---|---|
| `--color-bg` | `#F7FAFE` | Soft canvas page background (low-fatigue slate) |
| `--color-surface` | `#FFFFFF` | Card containers, panels, data tables (`surface-container-lowest`) |
| `--color-surface-subtle` | `#F1F4F8` | Table headers, secondary blocks (`surface-container-low`) |
| `--color-text` | `#181C1F` / `#0A1A33` | Primary executive text, deep navy headers |
| `--color-text-muted` | `#505F7B` / `#434655` | Secondary text, descriptors, timestamps |
| `--color-primary` | `#2563EB` / `#004AC6` | Primary action buttons, active tabs, commit triggers |
| `--color-primary-hover` | `#1D4ED8` | Primary button hover state |
| `--color-border` | `#E6ECF5` | Crisp 1px structural dividing hairline rules |
| `--color-border-focus` | `#CBD5E1` | Input outlines, active borders |
| `--color-confirmed` | `#16A34A` | "Confirmed from document" badge, approved scope additions |
| `--color-estimate` | `#F59E0B` | "Estimate" badge, unreviewed deltas, field warnings |
| `--color-ai` | `#7C3AED` | "AI interpretation" badge, optical delta scans |
| `--color-danger` | `#DC2626` | Critical conflict, rejected finding, document contradictions |
| `--color-sidebar` | `#0A1A33` | High-density structural navigation spine |

---

## 3. Typography

- **Headline Font:** `Plus Jakarta Sans`, sans-serif (structural weight, tight tracking `-0.025em`)
- **Body & Controls Font:** `Inter`, sans-serif (tabular readability, tall x-height)
- **Monospace & Code Font:** `JetBrains Mono`, monospace (CSI MasterFormat codes, revision hashes, quantities, currency)

### Type Scale

| Role | Family | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|---|
| `headline-xl` | Plus Jakarta Sans | 40px | 800 | 48px | -0.03em |
| `headline-lg` | Plus Jakarta Sans | 32px | 700 | 40px | -0.025em |
| `headline-md` | Plus Jakarta Sans | 24px | 700 | 32px | -0.02em |
| `headline-sm` | Plus Jakarta Sans | 18px | 600 | 26px | -0.015em |
| `body-lg` | Inter | 16px | 400 | 24px | -0.01em |
| `body-md` | Inter | 14px | 400 | 20px | -0.005em |
| `body-sm` | Inter | 13px | 400 | 18px | 0em |
| `label-md` | Inter | 12px | 600 | 16px | 0.02em |
| `label-sm` | Inter | 11px | 600 | 14px | 0.03em |
| `code-md` | JetBrains Mono | 13px | 500 | 18px | -0.01em |
| `code-sm` | JetBrains Mono | 11px | 500 | 14px | 0em |

---

## 4. Spacing, Radius, and Shadow

### Spacing
- `space-xs`: `0.25rem` (4px)
- `space-sm`: `0.5rem` (8px)
- `space-md`: `1rem` (16px)
- `space-lg`: `1.5rem` (24px)
- `space-xl`: `2.25rem` (36px)
- `gutter`: `1.25rem` (20px)
- `gutter-lg`: `2rem` (32px)
- `margin`: `1rem` (16px)
- `margin-md`: `1.5rem` (24px)
- `margin-lg`: `2.5rem` (40px)

### Radii
- Structural Cards, Containers & Panels: `14px` (`rounded-xl` / `rounded-2xl`)
- Form Inputs, Buttons, Dropdowns: `8px` (`rounded-lg`)
- Inline status tags, table selectors: `4px` - `6px` (`rounded-md`)
- Badges, Counter Pips, Telemetry chips: `9999px` (`rounded-full`)

### Elevation & Shadows
- **Level 0 (Canvas Base):** Neutral `#F4F7FB` with optional 24px subtle blueprint grid.
- **Level 1 (Card Workstation):** Solid `#FFFFFF`, `1px solid #E6ECF5`, shadow: `0 1px 3px 0 rgba(10, 26, 51, 0.04), 0 1px 2px -1px rgba(10, 26, 51, 0.02)`.
- **Level 2 (Hover / Active Row):** Solid `#FFFFFF`, `1px solid #D5DFEE`, shadow: `0 8px 16px -4px rgba(10, 26, 51, 0.08)`.
- **Level 3 (Modals / Overlays):** Solid `#FFFFFF`, `1px solid #CBD5E1`, shadow: `0 20px 28px -6px rgba(10, 26, 51, 0.16)`.
- **Structural Nav:** Solid `#0A1A33`, border `1px solid rgba(255, 255, 255, 0.08)`.

---

## 5. Components Specifications

### Status Badges
- **Confirmed from document:** Background `rgba(22, 163, 74, 0.08)`, border `rgba(22, 163, 74, 0.25)`, text `#15803D`.
- **Estimate:** Background `rgba(245, 158, 11, 0.10)`, border `rgba(245, 158, 11, 0.25)`, text `#B45309`.
- **AI interpretation:** Background `rgba(124, 58, 237, 0.08)`, border `rgba(124, 58, 237, 0.25)`, text `#6D28D9`.
- **Demo data badge:** Background `rgba(80, 95, 123, 0.10)`, border `rgba(80, 95, 123, 0.25)`, text `#394762`.

### Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, radius `8px`, height `38px` / `44px`. Hover `#1D4ED8`.
- **Secondary:** Background `#FFFFFF`, border `1px solid #E6ECF5`, text `#0A1A33`. Hover `#F8FAFC`.
- **Destructive:** Background `#DC2626`, text `#FFFFFF`. Hover `#B91C1C`.

### Data Tables
- **Header:** Sticky `#F8FAFC` row, border-bottom `1px solid #E6ECF5`, uppercase `label-sm` in `#64748B`.
- **Rows:** Alternating hover `#F8FAFC`, border-bottom `1px solid #F1F5F9`, row height `48px` (condensed `36px`).
- **Numbers / Codes:** `code-md` (`JetBrains Mono`) for exact tabular alignment.

---

## 6. Motion
Minimal until Phase 10. Motion conforms strictly to `prefers-reduced-motion`.
