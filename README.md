# ArchSaaS — نظام إدارة مشاريع التصميم

A full-stack Arabic RTL SaaS platform for architecture and interior design firms.

---

## What was added in this phase

- Real office-based multi-tenancy
- JWT now carries user office assignment
- API access checks for clients, projects, stages, feedback, estimates, and dashboard stats
- Frontend sidebar hides super-admin-only pages for office users
- Seeded 2 offices, 3 users, 4 clients, 4 projects, and workflow stages

---

## Database changes

- `users.office_id` added and made nullable
- `clients.office_id` used to scope client data by office
- `projects.office_id` used to scope project data by office
- All related seed data was updated to match office ownership

---

## New routes and behavior

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

### Office isolation
- `GET /api/clients` filters by office for non-super_admin
- `GET /api/projects` filters by office for non-super_admin
- `GET /api/projects/:id` returns 403 for cross-office access
- `PUT /api/projects/:id` returns 403 for cross-office access
- `DELETE /api/projects/:id` returns 403 for cross-office access
- `GET /api/projects/:id/stages` checks project ownership
- `GET /api/projects/:id/feedback` checks project ownership
- `POST /api/projects/:id/feedback` checks project ownership
- `GET /api/projects/:id/estimates` checks project ownership
- `POST /api/projects/:id/estimates` checks project ownership
- `PUT /api/stages/:stageId` checks parent project ownership
- `PUT /api/estimates/:estimateId` checks parent project ownership
- `DELETE /api/estimates/:estimateId` checks parent project ownership
- `GET /api/dashboard/stats` filters by office for non-super_admin
- `GET /api/dashboard/recent-projects` filters by office for non-super_admin
- `GET /api/dashboard/pending-approvals` filters by office for non-super_admin
- `GET /api/dashboard/recent-offices` stays super_admin-only

---

## How to test this feature

### Login accounts
- `admin@example.com` / `admin123` — sees everything
- `office1admin@example.com` / `admin123` — sees office 1 only
- `office2admin@example.com` / `admin123` — sees office 2 only

### Manual checks
1. Log in as `admin@example.com` and confirm all clients/projects appear.
2. Log in as `office1admin@example.com` and confirm only office 1 data appears.
3. Open `/api/projects/3` with office 1 token and confirm it returns `403`.
4. Check `/api/dashboard/stats` for each account and confirm office-filtered counts.
5. Confirm the sidebar hides `خطط الاشتراك` and `المكاتب` for non-super_admin users.

---

## Notes

- The app is Arabic RTL.
- All protected API requests use the stored JWT token.
- `super_admin` can see all offices and all data.
- `office_admin` and `team_member` can only see their office’s data.
