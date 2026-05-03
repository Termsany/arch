# ArchSaaS — نظام إدارة مشاريع التصميم

## What was added in this phase

- Client portal with RTL Arabic pages
- Client approvals and revision requests
- Role-based separation between admin and client sessions
- Admin client-portal account management
- Approval tracking on project stages

## Database changes

- `users.client_id` nullable
- new `stage_approvals` table
- approvals track `pending`, `approved`, and `revision_requested`
- seed data now includes a client portal account

## New routes

### Admin/API
- `GET /api/clients/:id/portal-user`
- `POST /api/clients/:id/portal-user`
- `GET /api/projects/:id/approvals`
- `GET /api/auth/client-me`

### Client portal
- `GET /api/client-portal/projects`
- `GET /api/client-portal/projects/:id`
- `GET /api/client-portal/projects/:id/stages`
- `GET /api/client-portal/projects/:id/feedback`
- `POST /api/client-portal/stages/:stageId/approve`
- `POST /api/client-portal/stages/:stageId/request-revision`

### Frontend
- `/client/login`
- `/client/projects`
- `/client/projects/:id`

## How to test the feature

1. Log in as `client@example.com` / `admin123` at `/client/login`.
2. Confirm only that client’s projects appear.
3. Open a project and verify stage list, approval badges, and feedback history.
4. Approve a stage or request revision and confirm the status changes.
5. Log in as `admin@example.com` / `admin123` and open `/clients` to create or view a portal account.
6. Confirm client tokens cannot access admin routes like `/api/clients`.

---

## Notes

- The app is Arabic RTL.
- All protected API requests use the stored JWT token.
- `super_admin` can see all offices and all data.
- `office_admin` and `team_member` can only see their office’s data.
