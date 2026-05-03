# ArchSaaS — نظام إدارة مشاريع التصميم

## Features

- Arabic RTL UI
- JWT authentication with role separation (super_admin, office_admin, team_member, client)
- Multi-office data isolation
- Project management with stage timelines
- Client portal for approvals and revision requests
- Project file management with versioning and client visibility controls

## Database tables

- `users` — staff and client portal accounts (`role`, `office_id`, `client_id`)
- `clients` — client records per office
- `projects` — projects linked to clients and offices
- `project_stages` — workflow stages per project
- `stage_approvals` — client approval records (`pending`, `approved`, `revision_requested`)
- `client_feedback` — comments and approvals log
- `project_estimates` — BOQ / estimate line items
- `project_files` — uploaded files with versioning and visibility
- `offices` — office records
- `subscription_plans` — plan catalog

## API routes

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/client-me`

### Admin — client portal accounts
- `GET /api/clients/:id/portal-user`
- `POST /api/clients/:id/portal-user`

### Admin — project files
- `GET /api/projects/:id/files`
- `POST /api/projects/:id/files` (multipart/form-data)
- `GET /api/stages/:stageId/files`
- `PUT /api/files/:fileId`
- `DELETE /api/files/:fileId`
- `PATCH /api/files/:fileId/mark-approved`
- `PATCH /api/files/:fileId/toggle-client-visible`

### Admin — stage approvals
- `GET /api/projects/:id/approvals`

### Client portal
- `GET /api/client-portal/projects`
- `GET /api/client-portal/projects/:id`
- `GET /api/client-portal/projects/:id/stages`
- `GET /api/client-portal/projects/:id/feedback`
- `GET /api/client-portal/projects/:id/files`
- `POST /api/client-portal/stages/:stageId/approve`
- `POST /api/client-portal/stages/:stageId/request-revision`

### Static files
- `GET /uploads/:filename`

## Frontend pages

- `/` — admin dashboard
- `/clients` — client list with portal-account management
- `/projects` — project list
- `/projects/:id` — project detail (stages, files, feedback, estimates)
- `/client/login` — client portal login
- `/client/projects` — client's project list
- `/client/projects/:id` — client project detail (stages, files, feedback)

## Test accounts

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | super_admin |
| office1admin@example.com | admin123 | office_admin (office 1) |
| office2admin@example.com | admin123 | office_admin (office 2) |
| client@example.com | admin123 | client (linked to client #1) |

## How to test file management

1. Log in as `admin@example.com` at `/login`.
2. Open any project → "ملفات المشروع" tab.
3. Click "رفع ملف" — choose a file, set category, notes, and visibility.
4. Upload the same category again and confirm `version_number` increments.
5. Click the star icon to set a version as approved.
6. Toggle the eye icon to switch a file between internal / client_visible.
7. Log in as `client@example.com` at `/client/login`, open the project, and confirm only `client_visible` files appear in the "ملفات المشروع" tab.

## File upload limits

- Max file size: `MAX_FILE_SIZE_MB` env var (default 25 MB)
- Allowed types: jpg, jpeg, png, webp, pdf, dwg, dxf, zip, rar, docx, xlsx
- Files stored locally in `artifacts/api-server/uploads/`
- Storage path abstracted so it can be replaced with S3 or Cloudinary later

## Notes

- The app is Arabic RTL throughout.
- Admin tokens (`localStorage.token`) are blocked from client-portal routes.
- Client tokens (`localStorage.clientToken`) are blocked from admin routes.
- `super_admin` sees all offices; `office_admin` and `team_member` see only their office.
