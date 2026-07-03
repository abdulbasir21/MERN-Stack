# SafeCity Complaint Portal — Backend API

A fictional civic-tech demo platform where citizens file and track complaints online, with separate roles for Citizens, Officers, and Admins.

---

## 🚀 Quick Start

```bash
cd backend
npm install

# Fill in your MongoDB URI and JWT secret in .env
cp .env .env.local   # edit as needed

# Seed demo data
npm run seed

# Start dev server
npm run dev
```

Server runs on `http://localhost:5000`

---

## ⚙️ Environment Variables

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/safecity
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=1d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Optional — email works without these (logs to console)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## 👤 Demo Accounts (after `npm run seed`)

| Role    | Email                    | Password  |
|---------|--------------------------|-----------|
| Admin   | admin@safecity.demo      | Demo@123  |
| Officer | officer1@safecity.demo   | Demo@123  |
| Officer | officer2@safecity.demo   | Demo@123  |
| Officer | officer3@safecity.demo   | Demo@123  |
| Officer | officer4@safecity.demo   | Demo@123  |
| Citizen | citizen@safecity.demo    | Demo@123  |

Or use the demo-login endpoint: `POST /api/auth/demo-login { "role": "citizen" }`

---

## 📡 API Reference

### Auth — `/api/auth`

| Method | Endpoint      | Auth | Description |
|--------|---------------|------|-------------|
| POST   | /register     | ❌   | Register citizen (name, email, password) |
| POST   | /login        | ❌   | Login → sets httpOnly cookie |
| POST   | /demo-login   | ❌   | Login as demo role → sets cookie |
| POST   | /logout       | ❌   | Clears auth cookie |
| GET    | /me           | ✅   | Get current user info |

### Complaints — `/api/complaints`

| Method | Endpoint          | Auth       | Role           | Description |
|--------|-------------------|------------|----------------|-------------|
| POST   | /                 | ✅         | citizen        | File complaint |
| GET    | /mine             | ✅         | citizen        | My complaints |
| GET    | /assigned         | ✅         | officer        | My assigned complaints |
| GET    | /:id              | ✅         | owner/officer/admin | View single complaint |
| PATCH  | /:id/status       | ✅         | officer/admin  | Update status + note |
| POST   | /:id/feedback     | ✅         | citizen (owner)| Rate resolved complaint |

### Admin — `/api/admin` (all require admin role)

| Method | Endpoint                     | Description |
|--------|------------------------------|-------------|
| GET    | /complaints                  | All complaints (filterable) |
| PATCH  | /complaints/:id/assign       | Assign to officer |
| GET    | /analytics                   | Stats & resolution metrics |
| POST   | /officers                    | Create officer account |
| GET    | /officers                    | List officers + stats |
| PATCH  | /officers/:id/deactivate     | Toggle officer active status |

### Public — `/api/public` (no auth)

| Method | Endpoint          | Description |
|--------|-------------------|-------------|
| GET    | /stats            | Total complaints, resolution rate, avg time |
| GET    | /recent-resolved  | Last 10 resolved (anonymized) |

---

## 🔐 Security Notes

- JWT stored in httpOnly cookie (not localStorage)
- CORS restricted to `FRONTEND_URL` with `credentials: true`
- Anonymous complaints hide citizen identity from officers
- Deactivated officers cannot log in

---

## 🌱 Seed Data

25 complaints distributed across:
- **5 categories**: theft, harassment, missing_person, fraud, other
- **6 areas**: Sector 5, Greenview, North District, Riverside, Old Town, Eastgate
- **6 statuses**: submitted, under_review, assigned, investigating, resolved, closed
- **10+ resolved** complaints with realistic time gaps for analytics to populate
- Some with officer notes and citizen feedback
