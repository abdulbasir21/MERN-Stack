# SafeCity Portal — Frontend

A civic-tech web application where citizens file complaints, officers manage them, and admins oversee everything. Built with React + Vite + Tailwind CSS (Google Stitch design system).

---

## 🚀 Quick Start

```bash
cd safecity-frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and expects the backend on `http://localhost:5000`.

---

## ⚙️ Environment

```bash
VITE_API_URL=http://localhost:5000/api
```

Edit `.env` if your backend runs on a different port or host.

---

## 📁 Project Structure

```
safecity-frontend/
├── index.html                    # Entry HTML (loads Inter + Material Symbols)
├── vite.config.js
├── tailwind.config.js            # Google Stitch design tokens
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                  # React root
    ├── App.jsx                   # BrowserRouter + all routes
    ├── index.css                 # Tailwind + shadow utilities
    ├── api/
    │   └── axios.js              # Axios instance (withCredentials for httpOnly cookie)
    ├── context/
    │   └── AuthContext.jsx       # Auth state, login/logout/demoLogin
    ├── components/
    │   ├── Badge.jsx             # Status & priority pill badges
    │   ├── Button.jsx            # Primary/secondary/danger buttons
    │   ├── Card.jsx              # Surface card wrapper
    │   ├── EmptyState.jsx        # Empty list placeholder
    │   ├── Navbar.jsx            # Top nav for public pages (+ demo dropdown)
    │   ├── ProtectedRoute.jsx    # Role-based route guard
    │   └── Sidebar.jsx           # Sidebar nav for authenticated dashboards
    └── pages/
        ├── Home.jsx              # Landing page (stats + recent resolved)
        ├── Login.jsx             # Login form + demo login buttons
        ├── Register.jsx          # Citizen registration
        ├── citizen/
        │   ├── CitizenDashboard.jsx   # My complaints list
        │   ├── NewComplaint.jsx       # File a complaint form
        │   └── ComplaintDetail.jsx    # View complaint + feedback
        ├── officer/
        │   ├── OfficerDashboard.jsx   # Assigned complaints grid
        │   └── ManageComplaint.jsx    # Update status + add notes
        └── admin/
            ├── AdminDashboard.jsx     # Analytics charts + assignment table
            ├── AllComplaints.jsx      # Filterable all-complaints table
            └── ManageOfficers.jsx     # Officer list + add/activate/deactivate
```

---

## 🔐 Authentication

- JWT is stored server-side in an **httpOnly cookie** — never in localStorage
- `withCredentials: true` is set globally on the Axios instance
- `AuthContext` calls `GET /api/auth/me` on mount to restore session
- `ProtectedRoute` guards every dashboard route by role

---

## 👥 Roles & Routes

| Role    | Routes accessible                                                      |
|---------|------------------------------------------------------------------------|
| Guest   | `/`, `/login`, `/register`                                             |
| Citizen | `/dashboard/citizen`, `/complaint/new`, `/complaint/:id`               |
| Officer | `/dashboard/officer`, `/complaint/:id/manage`, `/complaint/:id`        |
| Admin   | `/dashboard/admin`, `/admin/complaints`, `/admin/officers`, `/complaint/:id` |

---

## 🎨 Design System

Uses the **Google Stitch** token set, configured in `tailwind.config.js`:

- **Colors**: `primary`, `secondary`, `tertiary`, surface levels, status colors
- **Spacing**: `space-xs` through `space-3xl`, `gutter`, `container-max`
- **Typography**: `headline-xl` → `label-sm` mapped to Inter
- **Shadows**: `level-1-shadow`, `level-2-shadow` utility classes in `index.css`
- **Icons**: Google Material Symbols Outlined (loaded via Google Fonts CDN)

---

## 📡 API Endpoints Used

| Page/Feature           | Endpoint                              |
|------------------------|---------------------------------------|
| Session restore        | `GET /api/auth/me`                    |
| Login                  | `POST /api/auth/login`                |
| Demo login             | `POST /api/auth/demo-login`           |
| Register               | `POST /api/auth/register`             |
| Logout                 | `POST /api/auth/logout`               |
| Public stats           | `GET /api/public/stats`               |
| Recent resolved        | `GET /api/public/recent-resolved`     |
| File complaint         | `POST /api/complaints`                |
| My complaints          | `GET /api/complaints/mine`            |
| Single complaint       | `GET /api/complaints/:id`             |
| Submit feedback        | `POST /api/complaints/:id/feedback`   |
| Assigned complaints    | `GET /api/complaints/assigned`        |
| Update status          | `PATCH /api/complaints/:id/status`    |
| All complaints (admin) | `GET /api/admin/complaints`           |
| Assign officer         | `PATCH /api/admin/complaints/:id/assign` |
| Analytics              | `GET /api/admin/analytics`            |
| List officers          | `GET /api/admin/officers`             |
| Create officer         | `POST /api/admin/officers`            |
| Toggle officer status  | `PATCH /api/admin/officers/:id/deactivate` |

---

## 🧰 Dependencies

| Package           | Purpose                          |
|-------------------|----------------------------------|
| react             | UI library                       |
| react-router-dom  | Client-side routing              |
| axios             | HTTP client                      |
| react-hook-form   | Form validation                  |
| react-hot-toast   | Toast notifications              |
| recharts          | Charts (AdminDashboard)          |
| tailwindcss       | Utility-first CSS                |
| vite              | Build tool                       |
