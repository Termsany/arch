# ArchSaaS — نظام إدارة مشاريع التصميم

## Features

- Arabic RTL UI
- JWT authentication with role separation (super_admin, office_admin, team_member, client)
- Multi-office data isolation
- Project management with stage timelines
- Subscription plans with office limits and feature gates
- BOQ / costing system with advanced estimates and library items
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
- `project_files.file_url` / `project_files.storage_provider` — optional cloud-storage URL/provider metadata while keeping `file_path` for local compatibility
- `project_documents` — generated printable HTML quotations and project reports
- `project_tasks` — simple project and stage task assignments with status, priority, due dates, and completion timestamps
- `notifications` — internal in-app notifications scoped by office, user, client, and project
- `invoices` — office-scoped manual invoices linked to projects and clients
- `invoice_items` — invoice line items with calculated totals
- `payments` — manual payment records linked to invoices, projects, and clients
- `offices` — office records
- `office_settings` — onboarding state per office (`onboarding_completed`)
- `subscription_plans` — plan catalog

## API routes

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/client-me`
- `PUT /api/auth/change-password`
- `POST /api/auth/reset-password` (placeholder for future email flow)
- `POST /api/auth/logout`

### Admin — client portal accounts
- `GET /api/clients/:id/portal-user`
- `POST /api/clients/:id/portal-user`

### Admin — offices and subscriptions
- `GET /api/offices`
- `POST /api/offices`
- `GET /api/offices/:id`
- `PUT /api/offices/:id`
- `DELETE /api/offices/:id`
- `GET /api/plans`
- `GET /api/plans/active`
- `POST /api/plans`
- `PUT /api/plans/:id`
- `DELETE /api/plans/:id`
- `PATCH /api/plans/:id/toggle-active`
- `PATCH /api/plans/:id/recommended`

### Public onboarding
- `POST /api/onboarding/create-office`
- `GET /api/onboarding/status`
- `PATCH /api/onboarding/complete`

### Admin — project files
- `GET /api/projects/:id/files`
- `POST /api/projects/:id/files` (multipart/form-data)
- `GET /api/stages/:stageId/files`
- `PUT /api/files/:fileId`
- `DELETE /api/files/:fileId`
- `PATCH /api/files/:fileId/mark-approved`
- `PATCH /api/files/:fileId/toggle-client-visible`

### Admin — printable documents
- `GET /api/projects/:id/documents`
- `POST /api/projects/:id/documents/quotation`
- `POST /api/projects/:id/documents/project-report`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

### In-app notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`

### Project tasks
- `GET /api/tasks`
- `GET /api/tasks/assignees`
- `GET /api/projects/:id/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`
- `GET /api/dashboard/task-stats`

### Invoices and manual payments
- `GET /api/invoices`
- `GET /api/projects/:id/invoices`
- `GET /api/invoices/:id`
- `POST /api/projects/:id/invoices`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `PATCH /api/invoices/:id/status`
- `POST /api/invoices/:id/items`
- `PUT /api/invoice-items/:itemId`
- `DELETE /api/invoice-items/:itemId`
- `GET /api/invoices/:id/payments`
- `POST /api/invoices/:id/payments`
- `DELETE /api/payments/:id`
- `POST /api/invoices/:id/document`
- `GET /api/dashboard/finance-stats`

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
- `GET /api/uploads/:filename`
- Docker/Nginx also proxies `/uploads/:filename` to the backend for compatibility.

## Latest phase changes

- Added public office onboarding at `/start`.
- Added `office_settings` to track whether the office admin completed the starter checklist.
- Onboarding creates an office, office admin user, trial subscription dates, default BOQ categories, and selected active plan.
- Added dashboard onboarding checklist for office admins until it is completed.
- Added printable Arabic RTL quotations and project status reports generated from project, BOQ, workflow, feedback, approvals, and file data.
- Printable document creation now respects active/trial subscriptions and the plan's report/document feature flag.
- Document deletion is limited to `super_admin`, `office_admin`, `project_manager`, and `accountant`.
- Added internal in-app notifications with a top-bar bell, unread count, latest notifications dropdown, and `/notifications` page.
- Notifications are created for client approvals, revision requests, client-visible files, subscription limits, project status changes, stages waiting for client approval, and quotation generation.
- Notification routes validate ids and clamp list limits to avoid malformed SQL requests.
- Added simple project task management with `/tasks`, project-detail "مهام المشروع", dashboard task cards, status updates, assignment filters, and notification triggers for assignment/status changes.
- Added `project_tasks` schema and migration with office-scoped indexes for project, assignee, and status.
- Task routes now validate malformed task/project ids and return structured 400 errors instead of leaking SQL/runtime failures.
- Added manual invoices and payment tracking with `/invoices`, `/invoices/:id`, and `/projects/:id/invoices/new`.
- Added `invoices`, `invoice_items`, and `payments` tables with automatic subtotal, total, paid, remaining, overdue, partial, and paid status calculations.
- Added printable invoice documents through the existing `/documents/:id` viewer using document type `invoice`.
- Added dashboard finance cards for total invoices, paid amounts, outstanding amounts, and overdue invoices.
- Added invoice/payment notifications for invoice creation, payment recording, and overdue status changes.
- Fixed dashboard project status counters to support the Arabic statuses used by seeded data.
- Fixed client portal file download links to use the API upload route.
- Updated Docker/Nginx upload proxy routing.

## Frontend pages

- `/start` — public office onboarding and 14-day trial creation
- `/pricing` — public subscription pricing
- `/` — admin dashboard
- `/clients` — client list with portal-account management
- `/projects` — project list
- `/projects/:id` — project detail (stages, files, feedback, estimates)
- `/tasks` — office task list with project, status, priority, assignee, and overdue filters
- `/invoices` — office invoices and manual payment tracking
- `/invoices/:id` — invoice details, items, payments, totals, and printable invoice creation
- `/projects/:id/invoices/new` — create a new invoice for a project
- `/documents/:id` — printable Arabic RTL document viewer
- `/notifications` — in-app notifications list and read controls
- `/plans` — subscription plan management
- `/offices` — office and subscription management
- `/subscription` — current subscription overview
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

## Local setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
3. Set a strong `JWT_SECRET` and configure `DATABASE_URL`.
4. Apply the database schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```
5. Start the backend:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```
6. Start the frontend:
   ```bash
   pnpm --filter @workspace/arch-saas run dev
   ```

## Docker setup

The Docker setup uses PostgreSQL because the current codebase is wired to Drizzle/PostgreSQL through `DATABASE_URL`.

1. Review `.env.docker` and replace `JWT_SECRET` with a strong random value.
2. Build and start all services:
   ```bash
   docker compose up --build
   ```
3. Open the app:
   ```text
   http://localhost:5173
   ```
4. Backend health check:
   ```text
   http://localhost:5173/api/healthz
   ```

The compose stack includes:

- `postgres` — database service.
- `migrate` — applies the Drizzle schema before the backend starts.
- `backend` — Express API on internal port `4000`.
- `frontend` — Nginx static frontend on `http://localhost:5173`, with `/api` and `/uploads` proxied to the backend.

## Replit setup

- Add the variables from `.env.example` to Replit Secrets.
- Set `FRONTEND_URL` to the frontend URL Replit exposes.
- Set `UPLOAD_DIR` to a writable persistent directory when available.
- Run `pnpm install`, then start the backend and frontend packages from separate shells.

## Database import

- For a fresh database, use `pnpm --filter @workspace/db run push`.
- For this phase, ensure `database/migrations/001_office_settings.sql` or Drizzle push has created `office_settings`.
- Printable documents require `database/migrations/002_project_documents.sql` or Drizzle push to create `project_document_type`, `project_documents`, and indexes for `office_id` and `project_id`.
- Internal notifications require `database/migrations/003_notifications.sql` or Drizzle push to create `notifications` and indexes for `office_id`, `user_id`, `client_id`, and `project_id`.
- Project tasks require `database/migrations/004_project_tasks.sql` or Drizzle push to create `project_task_status`, `project_task_priority`, `project_tasks`, and indexes for `office_id`, `project_id`, `assigned_to`, and `status`.
- Invoices and manual payments require `database/migrations/005_invoices_payments.sql` or Drizzle push to create `invoice_status`, `invoices`, `invoice_items`, `payments`, their indexes, and add `invoice` to `project_document_type`.
- Cloud/local file storage metadata requires `database/migrations/006_file_storage_provider.sql` or Drizzle push to add `file_url` and `storage_provider` to `project_files`.
- The app currently runs on PostgreSQL; `html_content` is stored as `TEXT`, which is PostgreSQL's practical equivalent for the requested long printable HTML content.
- For an existing dump, import it with your database tool first, then run the app against the imported `DATABASE_URL`.
- The project currently uses Drizzle/PostgreSQL connection settings through `DATABASE_URL`; the `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` entries in `.env.example` are included for deployment platforms that expose split database variables.

## How to test onboarding

1. Open `/start`.
2. Choose an active plan and create a new office admin account with a unique email.
3. Confirm the success message shows the 14-day trial.
4. Log in with the new email and password.
5. Confirm the dashboard shows "قائمة البداية".
6. Click "إنهاء قائمة البداية" and confirm the checklist disappears.
7. In the database, confirm the new office has `subscription_status = trial`, a 14-day `subscription_end`, one `office_settings` row, and default BOQ categories.

## Environment variables

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — split database settings for hosts that require them.
- `DATABASE_URL` — primary database connection string used by the app.
- `PORT` — backend HTTP port.
- `JWT_SECRET` — required in production; use a long random value.
- `JWT_EXPIRES_IN` — JWT lifetime, default `7d`.
- `FRONTEND_URL` — allowed CORS origin. Use comma-separated URLs for multiple origins.
- `UPLOAD_DIR` — local upload storage path.
- `MAX_FILE_SIZE_MB` — upload limit in MB.
- `STORAGE_PROVIDER` — `local` by default. Keep this for development and Docker local uploads.
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` — reserved for S3-compatible storage.

## How to test file management

1. Log in as `admin@example.com` at `/login`.
2. Open any project → "ملفات المشروع" tab.
3. Click "رفع ملف" — choose a file, set category, notes, and visibility.
4. Upload the same category again and confirm `version_number` increments.
5. Click the star icon to set a version as approved.
6. Toggle the eye icon to switch a file between internal / client_visible.
7. Log in as `client@example.com` at `/client/login`, open the project, and confirm only `client_visible` files appear in the "ملفات المشروع" tab.

## How to test printable documents

1. Log in as an office admin, project manager, or accountant.
2. Open a project and go to "المستندات والتقارير".
3. Click "إنشاء عرض سعر" and confirm it opens `/documents/:id`.
4. Confirm the quotation includes client data, project data, BOQ items, totals, notes, and creation date.
5. Click "إنشاء تقرير حالة المشروع" and confirm it includes stages, statuses, latest feedback, pending approvals, file summary, and BOQ total.
6. Click "طباعة" in the document viewer and verify the browser print preview is Arabic RTL and A4 friendly.
7. Log in with another office user and confirm direct access to the first office document returns 403.
8. Create a quotation for a project with no BOQ items and confirm it shows an empty-state message instead of crashing.
9. Confirm offices without an active/trial subscription or without report/document access in their plan cannot create printable documents.
10. Confirm client portal users cannot access `/api/documents/:id`.

## How to test in-app notifications

1. Log in as `office1admin@example.com`.
2. Open a project and generate a quotation; confirm the bell unread count increases and `/notifications` shows "تم إنشاء عرض سعر".
3. Set a project stage to "في انتظار موافقة العميل"; log in as the linked client and confirm `GET /api/notifications` includes a client notification.
4. Approve the stage from the client portal and confirm the office admin receives "موافقة العميل".
5. Request a revision from the client portal and confirm the office admin receives "طلب تعديل".
6. Upload a file as `client_visible` or toggle a file to visible and confirm the client receives "ملف جديد".

## How to test project tasks

1. Log in as `office1admin@example.com`.
2. Open `/tasks`, create "مهمة جديدة" linked to an office project and assign it to a team member.
3. Confirm the task appears in the table and can be filtered by project, status, priority, assignee, and "المهام المتأخرة".
4. Change the status to "جاري العمل" or "مكتملة" and confirm the row updates.
5. Open the linked project and confirm "مهام المشروع" shows the same task.
6. Confirm dashboard cards show "مهامي", "المهام المتأخرة", and "مهام هذا الأسبوع".
7. Confirm the notification bell receives task assignment and task status change notifications.
8. Log in as another office admin and confirm direct access to the first office task returns 403.
9. Open `/api/tasks/abc` with a valid token and confirm it returns a structured 400 error.

## How to test invoices and manual payments

1. Log in as `office1admin@example.com`.
2. Open a project and go to "الفواتير والمدفوعات".
3. Click "فاتورة جديدة" and create an invoice with tax, discount, issue date, due date, and notes.
4. Open the invoice details page and add one or more items; confirm `الإجمالي = الكمية × سعر الوحدة`.
5. Confirm `إجمالي الفاتورة = subtotal + الضريبة - الخصم`.
6. Record a partial payment and confirm the status becomes "مدفوعة جزئياً" and `المتبقي` updates.
7. Record a payment equal to the remaining amount and confirm the status becomes "مدفوعة".
8. Create or update an unpaid invoice with a past due date and confirm it becomes "متأخرة".
9. Confirm `/invoices`, project invoice tab, and dashboard finance cards update.
10. Click "طباعة" in invoice details and confirm it creates an `invoice` document at `/documents/:id`.
11. Log in as another office admin and confirm direct access to the first office invoice returns 403.
12. Confirm client users cannot access invoice routes.
13. Confirm notification bell receives invoice creation and payment recording notifications.

## File upload limits

- Max file size: `MAX_FILE_SIZE_MB` env var (default 25 MB)
- Allowed types: jpg, jpeg, png, webp, pdf, dwg, dxf, zip, rar, docx, xlsx
- Files stored locally in `artifacts/api-server/uploads/`
- Storage is abstracted through `artifacts/api-server/src/lib/storage.ts`.
- `STORAGE_PROVIDER=local` writes files to `UPLOAD_DIR`, stores `storage_provider = local`, keeps `file_path`, and leaves `file_url` empty so existing `/api/uploads/:filename` links keep working.
- `STORAGE_PROVIDER=s3` is present as a guarded placeholder. Do not enable it in production until an S3 client implementation is added and tested.
- Frontend download links use `file_url` when present, otherwise fall back to `/api${file_path}` for existing local files.

## Notes

- The app is Arabic RTL throughout.
- Admin tokens (`localStorage.token`) are blocked from client-portal routes.
- Client tokens (`localStorage.clientToken`) are blocked from admin routes.
- API responses use `{ success, data, message }` for success and `{ success, message, errors }` for errors.
- Auth routes are rate limited, protected by Helmet, and CORS is restricted by `FRONTEND_URL`.
- `super_admin` sees all offices; `office_admin` and `team_member` see only their office.
- Subscription enforcement uses office plan limits for users, projects, clients, storage, and gated features.

## Production notes

- Always set `NODE_ENV=production` and a strong `JWT_SECRET`.
- Restrict `FRONTEND_URL` to trusted origins only.
- Put the API behind HTTPS.
- Move uploads to durable object storage before scaling beyond one server; wire the S3 provider implementation behind the existing storage service before switching `STORAGE_PROVIDER`.
- Keep database backups and test restore procedures.
- Review `TESTING.md` before each release.
