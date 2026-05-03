<<<<<<< HEAD
# arch
arch
=======
# ArchSaaS — نظام إدارة مشاريع التصميم

A full-stack Arabic RTL SaaS platform for architecture and interior design firms. Manage clients, projects, workflow stages, client feedback, estimates (BOQ), subscription plans, and offices — all in Arabic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, shadcn/ui, TanStack Query, wouter |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| API Contract | OpenAPI → Orval codegen |
| Package Manager | pnpm workspaces (monorepo) |

---

## Default Login Credentials

```
Email:    admin@example.com
Password: admin123
```

---

## Replit Setup (Fresh Clone)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

In Replit, open the **Secrets** tab and add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Auto-provisioned by Replit PostgreSQL |
| `JWT_SECRET` | any long random string | e.g. `arch_saas_jwt_secret_2024_secure` |
| `SESSION_SECRET` | any long random string | For session management |

> **Replit note:** `DATABASE_URL` and related `PG*` variables are automatically injected when you add a PostgreSQL database from the Replit Database tab. Do not set them manually.

### 3. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

This creates all tables: `users`, `subscription_plans`, `offices`, `clients`, `projects`, `project_stages`, `client_feedback`, `project_estimates`.

### 4. Seed the database

Run the seed script to populate default data (admin user, 3 subscription plans, 2 offices, 2 clients, 2 projects with all 12 workflow stages):

```bash
pnpm --filter @workspace/api-server run seed
```

> If no `seed` script exists, you can seed manually — see the **Manual Seed** section below.

### 5. Start the services

Replit manages workflows automatically. Use the **Run** button or start each workflow from the Replit UI:

| Workflow | Command | Port |
|---|---|---|
| API Server | `pnpm --filter @workspace/api-server run dev` | 8080 |
| Frontend (arch-saas) | `pnpm --filter @workspace/arch-saas run dev` | 21293 |

Both services are proxied through Replit's shared proxy at port 80:
- Frontend → `/`
- API → `/api`

---

## Running Locally (Outside Replit)

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/archsaas"
export JWT_SECRET="your_jwt_secret_here"
export SESSION_SECRET="your_session_secret_here"

# 3. Push schema to database
pnpm --filter @workspace/db run push

# 4. Start API server (terminal 1)
pnpm --filter @workspace/api-server run dev

# 5. Start frontend (terminal 2)
PORT=5173 pnpm --filter @workspace/arch-saas run dev
```

---

## Manual Database Seed

If the seed script is unavailable, run these SQL statements directly in your PostgreSQL database:

```sql
-- Admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'المدير الرئيسي',
  'admin@example.com',
  '$2b$10$5llh9faxb3Gjmy.B/iYQDuo0RCR.qecWw2wYWtCmKQOdC3tBJM2lq',
  'super_admin'
) ON CONFLICT DO NOTHING;

-- Subscription plans
INSERT INTO subscription_plans (name_ar, name_en, description_ar, monthly_price, yearly_price, max_users, max_projects, max_clients, storage_limit_mb, has_pdf_reports, is_active, sort_order)
VALUES
  ('فردي',  'Solo',       'مناسبة للمصمم المستقل',               499,  4990,  1,   5,   10,  1024,  true, true, 1),
  ('مكتب',  'Office',     'مناسبة للمكاتب الصغيرة والمتوسطة',   999,  9990,  5,   20,  50,  5120,  true, true, 2),
  ('شركة',  'Enterprise', 'مناسبة للشركات الكبيرة',              1999, 19990, 20,  100, 500, 20480, true, true, 3)
ON CONFLICT DO NOTHING;
```

---

## Project Structure

```
/
├── artifacts/
│   ├── api-server/         # Express 5 API (port 8080, path: /api)
│   └── arch-saas/          # React + Vite frontend (path: /)
├── lib/
│   ├── api-client-react/   # Generated React Query hooks (from OpenAPI)
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-zod/            # Generated Zod validation schemas
│   └── db/                 # Drizzle ORM schema + migrations
├── scripts/                # Shared utility scripts
├── pnpm-workspace.yaml
└── README.md
```

---

## Available API Endpoints

All endpoints are prefixed with `/api`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Login with email + password → returns JWT |
| GET | `/auth/me` | Yes | Get current user info |

### Dashboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | Yes | Aggregate stats (clients, projects, plans, offices) |
| GET | `/dashboard/recent-projects` | Yes | Last 5 projects |
| GET | `/dashboard/pending-approvals` | Yes | Projects awaiting client approval |
| GET | `/dashboard/recent-offices` | Yes | Last 5 offices |

### Clients
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/clients` | Yes | List all clients |
| POST | `/clients` | Yes | Create client |
| GET | `/clients/:id` | Yes | Get client |
| PUT | `/clients/:id` | Yes | Update client |
| DELETE | `/clients/:id` | Yes | Delete client |

### Projects
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Yes | List all projects |
| POST | `/projects` | Yes | Create project (auto-creates 12 workflow stages) |
| GET | `/projects/:id` | Yes | Get project |
| PUT | `/projects/:id` | Yes | Update project |
| DELETE | `/projects/:id` | Yes | Delete project |
| GET | `/projects/:id/stages` | Yes | Get project workflow stages |
| GET | `/projects/:id/feedback` | Yes | Get client feedback |
| POST | `/projects/:id/feedback` | Yes | Add client feedback |
| GET | `/projects/:id/estimates` | Yes | Get estimate items + total |
| POST | `/projects/:id/estimates` | Yes | Add estimate item |

### Stages & Estimates
| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/stages/:id` | Yes | Update stage status/notes |
| PUT | `/estimates/:id` | Yes | Update estimate item |
| DELETE | `/estimates/:id` | Yes | Delete estimate item |

### Subscription Plans
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/plans` | Yes | List all plans |
| POST | `/plans` | Yes | Create plan |
| GET | `/plans/active` | **No** | Public — list active plans (for pricing page) |
| GET | `/plans/:id` | Yes | Get plan |
| PUT | `/plans/:id` | Yes | Update plan |
| DELETE | `/plans/:id` | Yes | Delete plan |
| PATCH | `/plans/:id/toggle-active` | Yes | Toggle plan active/inactive |
| PATCH | `/plans/:id/recommended` | Yes | Set plan as recommended |

### Offices
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/offices` | Yes | List all offices |
| POST | `/offices` | Yes | Create office |
| GET | `/offices/:id` | Yes | Get office |
| PUT | `/offices/:id` | Yes | Update office |
| DELETE | `/offices/:id` | Yes | Delete office |

---

## Frontend Pages

| Path | Auth | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/` | Protected | Dashboard with stats and recent activity |
| `/clients` | Protected | Clients CRUD |
| `/projects` | Protected | Projects list and CRUD |
| `/projects/:id` | Protected | Project detail — stages, feedback, estimates |
| `/plans` | Protected | Subscription plans management |
| `/offices` | Protected | Offices management |
| `/pricing` | Public | Public pricing page (active plans) |

---

## Regenerate API Code (after OpenAPI changes)

If you modify `lib/api-spec/openapi.yaml`, regenerate the hooks and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This updates:
- `lib/api-client-react/src/generated/` — React Query hooks
- `lib/api-zod/src/generated/` — Zod validation schemas

---

## Database Schema Changes

After modifying any schema file in `lib/db/src/schema/`:

```bash
# Push changes directly to the database (development only)
pnpm --filter @workspace/db run push
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `SESSION_SECRET` | Yes | Secret for session management |
| `PORT` | No | API server port (default: 8080) |
| `NODE_ENV` | No | `development` or `production` |

---

## Arabic RTL Notes

- The entire UI is in **Arabic** with **RTL** layout (`dir="rtl"`)
- Font: **Cairo** (Google Fonts)
- Numbers and dates use `dir="ltr"` spans to display correctly
- All status labels, form fields, and error messages are in Arabic
>>>>>>> 7dd251d (Add comprehensive setup guide for project deployment)
