# Manual Testing Checklist

## Login
- Admin can log in at `/login`.
- Invalid credentials return a toast and do not enter the app.
- Expired or invalid tokens redirect to `/login`.
- Client can log in at `/client/login`.
- Logout clears the token and redirects to the correct login page.

## This Phase
- Backend typecheck passes.
- Backend production build passes.
- Frontend typecheck passes.
- Frontend production build passes.
- Docker backend responds at `/api/healthz`.
- Docker frontend serves `/start`.
- Docker frontend proxies `/api/healthz` to the backend.
- Onboarding smoke test creates a new office, logs in the office admin, reads checklist status, and completes onboarding.
- Printable document smoke test creates quotation and project report documents, opens one document, and verifies Arabic RTL HTML content.
- Printable document smoke test confirms invalid document IDs return 400, cross-office access returns 403, and client tokens are rejected.
- Notification smoke test creates quotation, stage-waiting, and client-approval notifications, then verifies unread count, mark-as-read, and office isolation.
- Task smoke test creates a project task, assigns it, changes status, verifies project detail listing, dashboard counters, notifications, office isolation, and deletion.
- Task invalid-id smoke test confirms `/api/tasks/abc`, `/api/tasks/abc/status`, and `/api/projects/abc/tasks` return structured 400 errors.
- Invoice smoke test creates an invoice, adds items, verifies totals, records payments, verifies partial/paid status, creates a printable invoice document, checks notifications, office isolation, client blocking, and deletion.

## Office Isolation
- `super_admin` can see all offices, clients, and projects.
- Office users only see records for their own `office_id`.
- Office users cannot open another office's clients, projects, files, stages, estimates, or feedback by URL.
- Office users cannot open another office's generated documents by URL.
- Office users cannot see another office's notifications.
- Client users cannot access admin routes.

## Clients CRUD
- Create a client with valid name and optional contact data.
- Empty name and invalid email are rejected.
- Edit client details.
- Delete a client.
- Create or update a client portal account.

## Projects CRUD
- Create a project for an existing client.
- Empty project name, missing client, and invalid numeric values are rejected.
- Edit project metadata.
- Delete a project.
- New projects receive the default workflow stages.

## Workflow
- Project stages load in the correct order.
- Stage status updates save correctly.
- Sending a stage for client approval creates or resets an approval record.
- Client approval and revision request flows update the stage and feedback log.

## Files
- Upload allowed file types within `MAX_FILE_SIZE_MB`.
- Oversized or disallowed files are rejected.
- File versions increment by stage and category.
- Uploaded rows store `storage_provider = local` when `STORAGE_PROVIDER=local`.
- Uploaded rows keep `file_path` for backward compatibility.
- Local uploaded rows may have empty `file_url`; frontend falls back to `/api/uploads/:filename`.
- Existing uploaded files without `file_url` still download from the legacy route.
- Approved-version marker works.
- Client visibility toggle works.
- Client portal only shows `client_visible` files.
- Client portal download links open through `/api/uploads/:filename`.
- Deleting a file removes the database row and local file.
- `STORAGE_PROVIDER=s3` without implementation/configuration returns a clear upload error and does not create a broken database row.

## Onboarding
- `/start` loads as a public route without a token.
- Active plans load in the plan selector.
- Duplicate email is rejected.
- Inactive or missing `plan_id` is rejected.
- Creating an office inserts `offices`, `users`, and `office_settings`.
- New office starts with `subscription_status = trial`.
- `subscription_start` is today's date.
- `subscription_end` is 14 days after `subscription_start`.
- New user role is `office_admin` and is linked to the new `office_id`.
- New office receives default BOQ categories.
- Office admin can log in immediately.
- Dashboard shows "قائمة البداية" while `onboarding_completed = false`.
- "إنهاء قائمة البداية" sets `onboarding_completed = true`.
- New office cannot see clients, projects, files, estimates, or feedback from other offices.

## Printable Documents
- `project_documents` table exists after migration or Drizzle push.
- `project_documents_office_id_idx` and `project_documents_project_id_idx` exist.
- `office_admin`, `project_manager`, and `accountant` can create quotation documents.
- `office_admin` and `project_manager` can create project report documents.
- Document creation is blocked when the office subscription is not `active` or `trial`.
- Document creation is blocked when the office plan does not include report/document access.
- Client users cannot access `/api/documents/:id`.
- Only `super_admin`, `office_admin`, `project_manager`, and `accountant` can delete generated documents.
- `/projects/:id` shows "المستندات والتقارير".
- "إنشاء عرض سعر" creates a document from office, client, project, and BOQ data.
- Quotation includes "بيانات العميل", "بيانات المشروع", "البنود", "الكمية", "الوحدة", "سعر الوحدة", "الإجمالي", and "إجمالي العرض".
- Quotation generation does not crash when BOQ has no items.
- "إنشاء تقرير حالة المشروع" includes workflow stages, latest client feedback, pending approvals, file summary, BOQ total, and report date.
- `/documents/:id` renders the stored `html_content` in Arabic RTL.
- "طباعة" triggers browser print preview through `window.print()`.
- Direct document access is scoped by `office_id`.

## In-App Notifications
- `notifications` table exists after migration or Drizzle push.
- Notification indexes exist for `office_id`, `user_id`, `client_id`, and `project_id`.
- `GET /api/notifications` returns latest notifications and `unreadCount`.
- `GET /api/notifications?limit=-1` is clamped safely and does not cause SQL errors.
- `PATCH /api/notifications/:id/read` marks one notification as read.
- Invalid notification ids return 400 for read and delete routes.
- `PATCH /api/notifications/read-all` marks scoped notifications as read.
- `DELETE /api/notifications/:id` deletes only notifications visible to the current user.
- Office users see office notifications where `user_id` is empty or equals their user id.
- Client users see only notifications linked to their `client_id`.
- Client approval creates "موافقة العميل".
- Client revision request creates "طلب تعديل".
- Stage status "في انتظار موافقة العميل" creates a client notification.
- Uploading or toggling a file to `client_visible` creates "ملف جديد" for the client.
- Subscription client/project limit failures create "حد الاشتراك".
- Project status changes create "تحديث حالة المشروع".
- Quotation generation creates "تم إنشاء عرض سعر".
- Top-bar bell shows unread count and latest notifications.
- `/notifications` shows empty, loading, read, unread, mark-read, mark-all-read, and delete states.

## Tasks
- `project_tasks` table exists after migration or Drizzle push.
- `project_task_status` and `project_task_priority` enums exist.
- Task indexes exist for `office_id`, `project_id`, `assigned_to`, and `status`.
- `GET /api/tasks` supports `project_id`, `assigned_to`, `status`, `priority`, and `overdue=true`.
- `GET /api/projects/:id/tasks` returns only tasks for the selected project and office.
- `GET /api/tasks/assignees` returns office staff users that can receive assignments.
- `office_admin` can create, edit, update status, and delete all office tasks.
- `project_manager` can create and edit tasks in the same office.
- `designer` can update status for tasks assigned to them.
- `accountant` can view tasks but cannot delete tasks.
- Assignees from another office are rejected.
- Stages from another project are rejected.
- Creating an assigned task creates an in-app notification.
- Changing task status creates an in-app notification.
- `/tasks` shows "المهام", filters, "مهمة جديدة", edit, delete, and status update controls.
- `/tasks?project_id=1` pre-filters the task list by project.
- `/projects/:id` shows "مهام المشروع" with assigned user, due date, status, and priority.
- Dashboard shows "مهامي", "المهام المتأخرة", and "مهام هذا الأسبوع".
- Cross-office direct access to `/api/tasks/:id` returns 403.
- Malformed task and project ids return 400 and do not create SQL/runtime errors.

## Invoices And Manual Payments
- `invoices`, `invoice_items`, and `payments` tables exist after migration or Drizzle push.
- `invoice_status` enum exists with `draft`, `sent`, `partially_paid`, `paid`, `overdue`, and `cancelled`.
- `project_document_type` includes `invoice`.
- Invoice indexes exist for `office_id`, `project_id`, `client_id`, and `status`.
- Payment indexes exist for `office_id`, `invoice_id`, `project_id`, and `client_id`.
- `office_admin` can create, edit, delete invoices, add/delete items, and record/delete payments in the same office.
- `accountant` can manage invoices and payments in the same office.
- `project_manager` can view invoices but cannot delete payments.
- `designer` cannot access invoice routes.
- Client users cannot access invoice routes.
- Cross-office direct access to `/api/invoices/:id` returns 403.
- Malformed invoice, item, payment, and project ids return 400.
- `POST /api/projects/:id/invoices` creates an invoice for the project client and office.
- Invoice number is generated automatically when left empty.
- `POST /api/invoices/:id/items` calculates `total_price = quantity * unit_price`.
- Invoice `subtotal` equals the sum of item totals.
- Invoice `total_amount` equals `subtotal + tax_amount - discount_amount`.
- Invoice `paid_amount` equals the sum of payments.
- Invoice `remaining_amount` equals `total_amount - paid_amount`.
- A partial payment changes status to `partially_paid`.
- Full payment changes status to `paid`.
- Past due unpaid invoice changes status to `overdue`.
- Manual `cancelled` status remains cancelled.
- `/invoices` lists office-scoped invoices.
- `/invoices/:id` shows invoice information, items, payments, totals, add item, record payment, and print controls.
- `/projects/:id` shows "الفواتير والمدفوعات" with project invoices, status, total, paid, remaining, due date, and create button.
- Dashboard shows "إجمالي الفواتير", "إجمالي المدفوع", "إجمالي المستحق", and "الفواتير المتأخرة".
- Invoice creation creates an `invoice_created` notification.
- Payment recording creates a `payment_recorded` notification.
- Overdue transition creates an `invoice_overdue` notification.
- `POST /api/invoices/:id/document` creates a printable `invoice` document.
- Printable invoice includes office name, client name, project name, invoice number, invoice items, totals, payments summary, and remaining amount.

## Billing Limits
- Inactive subscriptions cannot create new clients or projects.
- Client and project plan limits are enforced.
- Plan feature flags display correctly in the subscription page.
- Public pricing page only shows active plans.

## Invoices
- Confirm there are no exposed invoice routes in this MVP.
- If invoice routes are added later, verify create, update, paid/unpaid state, totals, and office isolation.

## Reports
- Dashboard stats load for admin and office users.
- Active and completed project counters include the Arabic status variants used by seed data.
- Recent projects respect office isolation.
- Printable report buttons do not show console errors.
