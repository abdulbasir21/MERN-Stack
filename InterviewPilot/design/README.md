# InterviewPilot AI Platform — Design System & UI Specs

This directory contains the pulled design system specifications, raw HTML templates, SVG assets, and rendered UI screenshots from the **InterviewPilot AI Platform** project in **Google Stitch**.

---

## 📁 Directory Structure

```
design/
├── DESIGN.md                     # Stitch Design System specification (colors, typography, spacing, tenets)
├── tokens.json                   # Full design token dictionary (M3 & Tailwind compatible values)
├── README.md                     # Design overview and screen inventory
└── screens/
    ├── candidate-dashboard.html  # Full HTML/Tailwind for Candidate Dashboard
    ├── candidate-dashboard.png   # High-resolution screenshot
    ├── interview-setup.html      # Full HTML/Tailwind for Setup & Customization
    ├── interview-setup.png       # High-resolution screenshot
    ├── live-interview-room.html  # Full HTML/Tailwind for Live Interview Cockpit
    ├── live-interview-room.png   # High-resolution screenshot
    ├── comprehensive-report.html # Full HTML/Tailwind for Detailed Performance Report
    ├── comprehensive-report.png  # High-resolution screenshot
    ├── ai-recruiter-avatar.png   # 3D Studio Portrait Render of AI Recruiter
    ├── logo.svg                  # Vector SVG platform logo
    └── logo.png                  # Rendered raster logo
```

---

## 🎨 Design Theme & Core Tokens

- **Theme Mode**: Dark Minimalist / Executive Synthetic
- **Primary Color**: `#3B82F6` (Electric Blue - Platform confidence & core CTAs)
- **Secondary Color**: `#06B6D4` (Cyan Stream - Live telemetry, waveform, speech indicators)
- **Tertiary Color**: `#6366F1` (Deep Indigo - AI cognition, synthetic scoring background engine)
- **Surface Foundations**:
  - `Canvas Base`: `#0F131C` / `#0B0F17`
  - `Surface Elevation 1`: `#111827` (Sidebars, cards, structural panels)
  - `Surface Elevation 2`: `#1E293B` (Floating controls, video canvas bezels, pill containers)
  - `Borders & Hairlines`: `#1E293B` (Subtle divider), `#334155` (Active / focused borders)
  - `Text Primary`: `#F8FAFC`
  - `Text Secondary / Muted`: `#94A3B8`
- **Typography**: **Inter** across all UI tiers (`tabular-nums` for timers and counters)
- **Border Radius**: Base `0.5rem` (8px), Cards `1rem` (16px), Badges & Chips `9999px` (Full pill)

---

## 🖥️ Screen Inventory

| Screen | HTML Template | Preview Screenshot | Description |
| :--- | :--- | :--- | :--- |
| **Candidate Dashboard** | [candidate-dashboard.html](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/candidate-dashboard.html) | [candidate-dashboard.png](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/candidate-dashboard.png) | Candidate overview, upcoming mock interviews, readiness score, performance trends, and quick start actions. |
| **Interview Setup** | [interview-setup.html](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/interview-setup.html) | [interview-setup.png](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/interview-setup.png) | Role selection, difficulty calibration, persona/interviewer choice, question topic configuration, and audio/video check. |
| **Live Interview Room** | [live-interview-room.html](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/live-interview-room.html) | [live-interview-room.png](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/live-interview-room.png) | Real-time dual feed cockpit (AI Recruiter + User Camera), live audio waveform telemetry, real-time transcription stream, and floating control dock. |
| **Comprehensive Report** | [comprehensive-report.html](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/comprehensive-report.html) | [comprehensive-report.png](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/comprehensive-report.png) | In-depth post-session score breakdown, speech pace/cadence analysis, filler words tracker, STAR-method grading, question-by-question critique, and recommended action steps. |

---

## 🖼️ Assets

- **AI Recruiter Avatar**: [ai-recruiter-avatar.png](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/ai-recruiter-avatar.png) (Photorealistic 3D render with subtle blue rim light)
- **Vector Logo**: [logo.svg](file:///d:/WD%20P/All%20Github%20Projects%20Division/MERN-Stack/InterviewPilot/design/screens/logo.svg) (Gradient icon + 'InterviewPilot' typography with sub-label)
